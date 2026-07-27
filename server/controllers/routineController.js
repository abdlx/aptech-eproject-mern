// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker backend by Munawwar).
// ============================================================================

import Routine from '../models/Routine.js';
import Workout from '../models/Workout.js';
import { buildSetLog, summarise } from '../services/workoutMath.js';
import { paginate, buildMeta } from '../utils/pagination.js';

function normaliseExercises(list = []) {
  return list.map((exercise, index) => ({
    name: exercise.name,
    targetSets: exercise.targetSets ?? 3,
    targetReps: exercise.targetReps ?? 10,
    targetWeight: exercise.targetWeight ?? 0,
    restSeconds: exercise.restSeconds ?? 90,
    notes: exercise.notes,
    order: exercise.order ?? index,
  })).sort((a, b) => a.order - b.order);
}

export const getRoutines = async (req, res, next) => {
  try {
    const query = { user: req.user._id };
    if (req.query.includeArchived !== 'true') query.isArchived = false;
    if (req.query.category) query.category = req.query.category;
    if (req.query.search) query.name = { $regex: String(req.query.search), $options: 'i' };

    const wantsPage = req.query.page !== undefined || req.query.limit !== undefined;
    if (!wantsPage) {
      return res.json(await Routine.find(query).sort({ updatedAt: -1 }));
    }

    const { page, limit, skip } = paginate(req.query);
    const [items, total] = await Promise.all([
      Routine.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit),
      Routine.countDocuments(query),
    ]);
    res.json({ items, meta: buildMeta(total, page, limit) });
  } catch (error) {
    next(error);
  }
};

export const getRoutine = async (req, res, next) => {
  try {
    const routine = await Routine.findOne({ _id: req.params.id, user: req.user._id });
    if (!routine) return res.status(404).json({ message: 'Routine not found' });
    res.json(routine);
  } catch (error) {
    next(error);
  }
};

export const createRoutine = async (req, res, next) => {
  try {
    const { name, description, category, exercises, tags } = req.body || {};
    if (!name || !Array.isArray(exercises) || !exercises.length) {
      return res.status(400).json({ message: 'name and at least one exercise are required' });
    }

    const routine = await Routine.create({
      user: req.user._id,
      name,
      description,
      category,
      exercises: normaliseExercises(exercises),
      tags,
    });

    res.status(201).json(routine);
  } catch (error) {
    next(error);
  }
};

export const updateRoutine = async (req, res, next) => {
  try {
    const payload = { ...(req.body || {}) };
    if (payload.exercises) payload.exercises = normaliseExercises(payload.exercises);
    // Performance counters are maintained by the session flow, not the client.
    delete payload.timesPerformed;
    delete payload.lastPerformedAt;

    const routine = await Routine.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      payload,
      { new: true, runValidators: true },
    );
    if (!routine) return res.status(404).json({ message: 'Routine not found' });
    res.json(routine);
  } catch (error) {
    next(error);
  }
};

// Archive rather than delete by default: past sessions reference the routine,
// and hard-deleting would orphan them.
export const deleteRoutine = async (req, res, next) => {
  try {
    if (req.query.hard === 'true') {
      const routine = await Routine.findOneAndDelete({ _id: req.params.id, user: req.user._id });
      if (!routine) return res.status(404).json({ message: 'Routine not found' });
      return res.json({ message: 'Routine deleted' });
    }

    const routine = await Routine.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isArchived: true },
      { new: true },
    );
    if (!routine) return res.status(404).json({ message: 'Routine not found' });
    res.json({ message: 'Routine archived', routine });
  } catch (error) {
    next(error);
  }
};

// Starts a live session from a routine: copies the plan onto a new Workout and
// pre-builds an empty set log so the client has something to tick off.
export const startRoutine = async (req, res, next) => {
  try {
    const routine = await Routine.findOne({ _id: req.params.id, user: req.user._id });
    if (!routine) return res.status(404).json({ message: 'Routine not found' });

    // Only one session may be in flight at a time — otherwise "the active
    // workout" is ambiguous for both the UI and the resume flow.
    const existing = await Workout.findOne({ user: req.user._id, status: 'active' });
    if (existing) {
      return res.status(409).json({
        message: 'You already have a workout in progress',
        workout: existing,
      });
    }

    const exercises = routine.exercises.map((exercise, index) => ({
      name: exercise.name,
      order: exercise.order ?? index,
      restSeconds: exercise.restSeconds,
      notes: exercise.notes,
      targetSets: exercise.targetSets,
      targetReps: exercise.targetReps,
      targetWeight: exercise.targetWeight,
      // Flat fields mirror the plan so legacy readers still see something.
      sets: exercise.targetSets,
      reps: exercise.targetReps,
      weight: exercise.targetWeight,
      setLog: buildSetLog(exercise),
    }));

    const workout = await Workout.create({
      user: req.user._id,
      routine: routine._id,
      name: routine.name,
      category: routine.category,
      status: 'active',
      startedAt: new Date(),
      exercises,
      tags: routine.tags,
      summary: summarise({ exercises }),
    });

    res.status(201).json(workout);
  } catch (error) {
    next(error);
  }
};
