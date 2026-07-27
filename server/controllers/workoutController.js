// ============================================================================
// Original author: Munawwar (base Fitness Tracker backend).
// Modified by: Abdullah — notify() service, goal checks, pagination, and the
// live-session flow (active workout, per-set logging, completion, volume).
// ============================================================================

import Workout from '../models/Workout.js';
import Routine from '../models/Routine.js';
import { notify } from '../services/notificationService.js';
import { checkGoalsForUser } from '../services/goalService.js';
import { summarise, buildSetLog } from '../services/workoutMath.js';
import { paginate, buildMeta } from '../utils/pagination.js';

// Fills in per-exercise defaults for directly-logged workouts so that even a
// quick log gets a set log and a volume figure.
function prepareExercises(list = []) {
  return list.map((exercise, index) => {
    const prepared = {
      name: exercise.name,
      sets: exercise.sets,
      reps: exercise.reps,
      weight: exercise.weight,
      notes: exercise.notes,
      order: exercise.order ?? index,
      restSeconds: exercise.restSeconds ?? 90,
      targetSets: exercise.targetSets ?? exercise.sets,
      targetReps: exercise.targetReps ?? exercise.reps,
      targetWeight: exercise.targetWeight ?? exercise.weight,
      setLog: exercise.setLog,
    };

    // A workout logged after the fact has no per-set detail; synthesise a
    // completed set log from the flat numbers so volume and completion work
    // the same way they do for a tracked session.
    if (!Array.isArray(prepared.setLog) || !prepared.setLog.length) {
      prepared.setLog = buildSetLog(prepared).map((set) => ({
        ...set,
        completed: true,
        completedAt: new Date(),
      }));
    }

    return prepared;
  }).sort((a, b) => a.order - b.order);
}

// Get All Workouts. Returns a bare array by default (back-compat); when `page`
// or `limit` is supplied, returns a paginated { items, meta } envelope.
export const getWorkouts = async (req, res, next) => {
  try {
    const { category, search, status, from, to } = req.query;
    let query = { user: req.user._id };

    if (category) query.category = category;
    if (search) query.name = { $regex: search, $options: 'i' };
    if (status) query.status = status;
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lt = new Date(to);
    }

    const wantsPage = req.query.page !== undefined || req.query.limit !== undefined;
    if (!wantsPage) {
      const workouts = await Workout.find(query).sort({ date: -1 });
      return res.json(workouts);
    }

    const { page, limit, skip } = paginate(req.query);
    const [items, total] = await Promise.all([
      Workout.find(query).sort({ date: -1 }).skip(skip).limit(limit),
      Workout.countDocuments(query),
    ]);
    res.json({ items, meta: buildMeta(total, page, limit) });
  } catch (error) {
    next(error);
  }
};

// The single in-flight session, if any. Lets the client resume a workout that
// was started on another device or before a refresh.
export const getActiveWorkout = async (req, res, next) => {
  try {
    const workout = await Workout.findOne({ user: req.user._id, status: 'active' })
      .populate('routine', 'name category');
    if (!workout) return res.status(204).end();
    res.json(workout);
  } catch (error) {
    next(error);
  }
};

// Create Workout
export const createWorkout = async (req, res, next) => {
  try {
    const { name, category, exercises, tags, status, date, durationSeconds } = req.body || {};

    const prepared = prepareExercises(exercises);
    const workout = await Workout.create({
      user: req.user._id,
      name,
      category,
      exercises: prepared,
      tags,
      status: status || 'completed',
      durationSeconds,
      completedAt: status === 'active' ? undefined : new Date(),
      summary: summarise({ exercises: prepared }),
      ...(date ? { date: new Date(date) } : {}),
    });

    await notify({
      user: req.user._id,
      message: `Workout "${name}" completed successfully!`,
      type: 'workout'
    });

    // Re-evaluates workout-count, session-count and volume goals.
    await checkGoalsForUser(req.user._id, 'workout');

    res.status(201).json(workout);
  } catch (error) {
    next(error);
  }
};

// Records one set's actuals during a live session. Kept as its own endpoint so
// ticking a set is a single small write rather than a whole-workout PUT.
export const logSet = async (req, res, next) => {
  try {
    const { exerciseId, setId } = req.params;
    const { reps, weight, completed } = req.body || {};

    const workout = await Workout.findOne({ _id: req.params.id, user: req.user._id });
    if (!workout) return res.status(404).json({ message: 'Workout not found' });

    const exercise = workout.exercises.id(exerciseId);
    if (!exercise) return res.status(404).json({ message: 'Exercise not found' });

    const set = exercise.setLog.id(setId);
    if (!set) return res.status(404).json({ message: 'Set not found' });

    if (reps !== undefined) set.reps = reps;
    if (weight !== undefined) set.weight = weight;
    if (completed !== undefined) {
      set.completed = completed;
      set.completedAt = completed ? new Date() : undefined;
    }

    workout.summary = summarise(workout);
    await workout.save();

    res.json(workout);
  } catch (error) {
    next(error);
  }
};

// Adds an extra set to an exercise mid-session (an AMRAP or a bonus set).
export const addSet = async (req, res, next) => {
  try {
    const workout = await Workout.findOne({ _id: req.params.id, user: req.user._id });
    if (!workout) return res.status(404).json({ message: 'Workout not found' });

    const exercise = workout.exercises.id(req.params.exerciseId);
    if (!exercise) return res.status(404).json({ message: 'Exercise not found' });

    // Express 5 leaves req.body undefined when no JSON body is sent, so these
    // endpoints must not assume an object is there.
    const { reps, weight } = req.body || {};
    const last = exercise.setLog.at(-1);
    exercise.setLog.push({
      setNumber: exercise.setLog.length + 1,
      reps: reps ?? last?.reps ?? exercise.targetReps ?? 0,
      weight: weight ?? last?.weight ?? exercise.targetWeight ?? 0,
      completed: false,
    });

    workout.summary = summarise(workout);
    await workout.save();
    res.status(201).json(workout);
  } catch (error) {
    next(error);
  }
};

// Finishes a live session: stamps the duration, freezes the summary, bumps the
// routine's counters, and fires goal checks.
export const completeWorkout = async (req, res, next) => {
  try {
    const workout = await Workout.findOne({ _id: req.params.id, user: req.user._id });
    if (!workout) return res.status(404).json({ message: 'Workout not found' });
    if (workout.status === 'completed') {
      return res.status(409).json({ message: 'Workout is already completed' });
    }

    // Finishing takes no required body, so it may arrive without one.
    const { abandoned, durationSeconds } = req.body || {};
    const now = new Date();
    workout.status = abandoned ? 'abandoned' : 'completed';
    workout.completedAt = now;
    workout.durationSeconds = workout.startedAt
      ? Math.max(0, Math.round((now - workout.startedAt) / 1000))
      : (durationSeconds || 0);
    workout.summary = summarise(workout);
    await workout.save();

    if (workout.routine && workout.status === 'completed') {
      await Routine.findByIdAndUpdate(workout.routine, {
        $inc: { timesPerformed: 1 },
        $set: { lastPerformedAt: now },
      });
    }

    if (workout.status === 'completed') {
      await notify({
        user: req.user._id,
        message: `Finished "${workout.name}" — ${workout.summary.completedSets} sets, ${workout.summary.volume} kg volume`,
        type: 'workout',
      });
      await checkGoalsForUser(req.user._id, 'workout');
    }

    res.json(workout);
  } catch (error) {
    next(error);
  }
};

// Update Workout
export const updateWorkout = async (req, res, next) => {
  try {
    const workout = await Workout.findById(req.params.id);

    if (!workout) {
      return res.status(404).json({ message: 'Workout not found' });
    }

    if (workout.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const payload = { ...(req.body || {}) };
    if (payload.exercises) payload.exercises = prepareExercises(payload.exercises);
    // Always derived, never client-supplied.
    delete payload.summary;

    Object.assign(workout, payload);
    workout.summary = summarise(workout);
    await workout.save();

    await checkGoalsForUser(req.user._id, 'workout');
    res.json(workout);
  } catch (error) {
    next(error);
  }
};

// Delete Workout
export const deleteWorkout = async (req, res, next) => {
  try {
    const workout = await Workout.findById(req.params.id);

    if (!workout) {
      return res.status(404).json({ message: 'Workout not found' });
    }

    if (workout.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await workout.deleteOne();
    res.json({ message: 'Workout removed' });
  } catch (error) {
    next(error);
  }
};
