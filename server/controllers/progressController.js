// ============================================================================
// Original author: Munawwar (base Fitness Tracker backend).
// Modified by: Abdullah — added features on top (see AUTHORS.md for what changed).
// ============================================================================

import Progress from '../models/Progress.js';
import { notify } from '../services/notificationService.js';
import { checkGoalsForUser } from '../services/goalService.js';
import { paginate, buildMeta } from '../utils/pagination.js';

// Get All Progress. Bare array by default; paginated envelope when `page`/`limit`
// is supplied.
export const getProgress = async (req, res) => {
  try {
    const query = { user: req.user._id };
    const wantsPage = req.query.page !== undefined || req.query.limit !== undefined;
    if (!wantsPage) {
      const progress = await Progress.find(query).sort({ date: -1 });
      return res.json(progress);
    }

    const { page, limit, skip } = paginate(req.query);
    const [items, total] = await Promise.all([
      Progress.find(query).sort({ date: -1 }).skip(skip).limit(limit),
      Progress.countDocuments(query),
    ]);
    res.json({ items, meta: buildMeta(total, page, limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create Progress
export const createProgress = async (req, res) => {
  try {
    const { weight, bodyMeasurements, performanceMetrics, notes } = req.body;

    const progress = await Progress.create({
      user: req.user._id,
      weight,
      bodyMeasurements,
      performanceMetrics,
      notes
    });

    // Automatic notification
    await notify({
      user: req.user._id,
      message: `Progress logged! Weight: ${weight}kg`,
      type: 'progress'
    });

    // 'progress' is the write source; goalService maps it to the 'weight'
    // metric. It used to be passed straight through as a metric name, which
    // matched no goal, so weight goals were never auto-achieved.
    await checkGoalsForUser(req.user._id, 'progress');

    res.status(201).json(progress);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Progress
export const updateProgress = async (req, res) => {
  try {
    const progress = await Progress.findById(req.params.id);

    if (!progress) {
      return res.status(404).json({ message: 'Progress not found' });
    }

    if (progress.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const updatedProgress = await Progress.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updatedProgress);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Progress
export const deleteProgress = async (req, res) => {
  try {
    const progress = await Progress.findById(req.params.id);

    if (!progress) {
      return res.status(404).json({ message: 'Progress not found' });
    }

    if (progress.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await progress.deleteOne();
    res.json({ message: 'Progress removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};