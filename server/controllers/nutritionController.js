// ============================================================================
// Original author: Munawwar (base Fitness Tracker backend).
// Modified by: Abdullah — added features on top (see AUTHORS.md for what changed).
// ============================================================================

import Nutrition from '../models/Nutrition.js';
import { notify } from '../services/notificationService.js';
import { checkGoalsForUser } from '../services/goalService.js';
import { paginate, buildMeta } from '../utils/pagination.js';

// Get All Nutrition Logs. Bare array by default; paginated envelope when
// `page`/`limit` is supplied.
export const getNutrition = async (req, res) => {
  try {
    const { mealType, search } = req.query;
    let query = { user: req.user._id };

    if (mealType) query.mealType = mealType;
    if (search) query['foods.name'] = { $regex: search, $options: 'i' };

    const wantsPage = req.query.page !== undefined || req.query.limit !== undefined;
    if (!wantsPage) {
      const nutrition = await Nutrition.find(query).sort({ date: -1 });
      return res.json(nutrition);
    }

    const { page, limit, skip } = paginate(req.query);
    const [items, total] = await Promise.all([
      Nutrition.find(query).sort({ date: -1 }).skip(skip).limit(limit),
      Nutrition.countDocuments(query),
    ]);
    res.json({ items, meta: buildMeta(total, page, limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create Nutrition Log
export const createNutrition = async (req, res) => {
  try {
    const { mealType, foods } = req.body;

    const nutrition = await Nutrition.create({
      user: req.user._id,
      mealType,
      foods
    });

    // Automatic notification
    await notify({
      user: req.user._id,
      message: `${mealType} meal logged successfully!`,
      type: 'nutrition'
    });

    await checkGoalsForUser(req.user._id, 'nutrition');

    res.status(201).json(nutrition);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Nutrition Log
export const updateNutrition = async (req, res) => {
  try {
    const nutrition = await Nutrition.findById(req.params.id);

    if (!nutrition) {
      return res.status(404).json({ message: 'Nutrition log not found' });
    }

    if (nutrition.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const updatedNutrition = await Nutrition.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updatedNutrition);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Nutrition Log
export const deleteNutrition = async (req, res) => {
  try {
    const nutrition = await Nutrition.findById(req.params.id);

    if (!nutrition) {
      return res.status(404).json({ message: 'Nutrition log not found' });
    }

    if (nutrition.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await nutrition.deleteOne();
    res.json({ message: 'Nutrition log removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};