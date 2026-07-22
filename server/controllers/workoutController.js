// ============================================================================
// Original author: Munawwar (base Fitness Tracker backend).
// Modified by: Abdullah — added features on top (see AUTHORS.md for what changed).
// ============================================================================

import Workout from '../models/Workout.js';
import { notify } from '../services/notificationService.js';
import { checkGoalsForUser } from '../services/goalService.js';
import { paginate, buildMeta } from '../utils/pagination.js';

// Get All Workouts. Returns a bare array by default (back-compat); when `page`
// or `limit` is supplied, returns a paginated { items, meta } envelope.
export const getWorkouts = async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = { user: req.user._id };

    if (category) query.category = category;
    if (search) query.name = { $regex: search, $options: 'i' };

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
    res.status(500).json({ message: error.message });
  }
};

// Create Workout
export const createWorkout = async (req, res) => {
  try {
    const { name, category, exercises, tags } = req.body;

    const workout = await Workout.create({
      user: req.user._id,
      name,
      category,
      exercises,
      tags
    });

    // Automatic notification
    await notify({
      user: req.user._id,
      message: `Workout "${name}" completed successfully!`,
      type: 'workout'
    });

    // Re-evaluate goals that track workout counts.
    await checkGoalsForUser(req.user._id, 'workout');

    res.status(201).json(workout);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Workout
export const updateWorkout = async (req, res) => {
  try {
    const workout = await Workout.findById(req.params.id);

    if (!workout) {
      return res.status(404).json({ message: 'Workout not found' });
    }

    if (workout.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const updatedWorkout = await Workout.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updatedWorkout);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Workout
export const deleteWorkout = async (req, res) => {
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
    res.status(500).json({ message: error.message });
  }
};