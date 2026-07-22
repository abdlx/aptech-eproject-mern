// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker backend by Munawwar).
// ============================================================================

import Goal from '../models/Goal.js';
import { checkGoalsForUser } from '../services/goalService.js';

export const getGoals = async (req, res, next) => {
  try {
    const goals = await Goal.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(goals);
  } catch (error) {
    next(error);
  }
};

export const createGoal = async (req, res, next) => {
  try {
    const { title, metric, target, direction, deadline } = req.body;
    if (!title || !metric || target === undefined) {
      return res.status(400).json({ message: 'title, metric, and target are required' });
    }
    const goal = await Goal.create({
      user: req.user._id,
      title,
      metric,
      target,
      direction,
      deadline,
    });
    // A new goal may already be satisfied by existing data.
    await checkGoalsForUser(req.user._id, metric);
    const fresh = await Goal.findById(goal._id);
    res.status(201).json(fresh);
  } catch (error) {
    next(error);
  }
};

export const updateGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true },
    );
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    res.json(goal);
  } catch (error) {
    next(error);
  }
};

export const deleteGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    res.json({ message: 'Goal removed' });
  } catch (error) {
    next(error);
  }
};
