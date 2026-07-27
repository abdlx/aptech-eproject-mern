// ============================================================================
// Original author: Munawwar (base Fitness Tracker backend).
// Modified by: Abdullah — food-table resolution, computed totals, daily summary.
// ============================================================================

import mongoose from 'mongoose';
import Nutrition from '../models/Nutrition.js';
import Food from '../models/Food.js';
import { notify } from '../services/notificationService.js';
import { checkGoalsForUser } from '../services/goalService.js';
import { resolveFoodEntry, sumEntries, macroSplit } from '../services/nutritionMath.js';
import { resolveTargets } from '../services/targetService.js';
import { paginate, buildMeta } from '../utils/pagination.js';

// Turns the client's raw food entries into resolved, macro-bearing entries.
// Entries referencing the food table are scaled from its per-100 basis; the
// rest keep the typed values. One DB round trip for all referenced foods.
async function resolveFoods(rawFoods = [], userId) {
  if (!Array.isArray(rawFoods) || !rawFoods.length) {
    return { entries: [], totals: sumEntries([]) };
  }

  const ids = rawFoods
    .map((entry) => entry.food)
    .filter((id) => id && mongoose.isValidObjectId(id));

  const foods = ids.length
    ? await Food.find({ _id: { $in: ids }, $or: [{ owner: null }, { owner: userId }] })
    : [];
  const byId = new Map(foods.map((food) => [String(food._id), food]));

  const entries = rawFoods.map((entry) => resolveFoodEntry(
    entry,
    entry.food ? byId.get(String(entry.food)) || null : null,
  ));

  return { entries, totals: sumEntries(entries) };
}

// Get All Nutrition Logs. Bare array by default; paginated envelope when
// `page`/`limit` is supplied.
export const getNutrition = async (req, res, next) => {
  try {
    const { mealType, search, from, to } = req.query;
    let query = { user: req.user._id };

    if (mealType) query.mealType = mealType;
    if (search) query['foods.name'] = { $regex: search, $options: 'i' };
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lt = new Date(to);
    }

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
    next(error);
  }
};

// Daily rollup against the user's targets. The dashboard used to compute this
// client-side against hardcoded numbers; it is now server-side and personal.
export const getDailySummary = async (req, res, next) => {
  try {
    const day = req.query.date ? new Date(req.query.date) : new Date();
    if (Number.isNaN(day.getTime())) {
      return res.status(400).json({ message: 'Invalid date' });
    }
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const meals = await Nutrition.find({
      user: req.user._id,
      date: { $gte: start, $lt: end },
    }).sort({ date: 1 });

    // Sum the stored per-meal totals rather than re-walking every food entry.
    const consumed = sumEntries(meals.map((meal) => meal.totals || {}));
    const targets = await resolveTargets(req.user);

    // Per-meal-type breakdown, so the UI can show where the day's calories went.
    const byMealType = ['breakfast', 'lunch', 'dinner', 'snack'].reduce((acc, type) => {
      const forType = meals.filter((meal) => meal.mealType === type);
      acc[type] = {
        count: forType.length,
        ...sumEntries(forType.map((meal) => meal.totals || {})),
      };
      return acc;
    }, {});

    res.json({
      date: start,
      consumed,
      targets,
      remaining: {
        calories: Math.round((targets.calories || 0) - consumed.calories),
        protein: Math.round((targets.protein || 0) - consumed.protein),
        carbs: Math.round((targets.carbs || 0) - consumed.carbs),
        fats: Math.round((targets.fats || 0) - consumed.fats),
      },
      macroSplit: macroSplit(consumed),
      mealCount: meals.length,
      byMealType,
    });
  } catch (error) {
    next(error);
  }
};

// Create Nutrition Log
export const createNutrition = async (req, res, next) => {
  try {
    const { mealType, foods, date, notes } = req.body || {};

    const { entries, totals } = await resolveFoods(foods, req.user._id);

    const nutrition = await Nutrition.create({
      user: req.user._id,
      mealType,
      foods: entries,
      totals,
      notes,
      ...(date ? { date: new Date(date) } : {}),
    });

    await notify({
      user: req.user._id,
      message: `${mealType} logged — ${Math.round(totals.calories)} kcal`,
      type: 'nutrition'
    });

    await checkGoalsForUser(req.user._id, 'nutrition');

    res.status(201).json(nutrition);
  } catch (error) {
    next(error);
  }
};

// Update Nutrition Log
export const updateNutrition = async (req, res, next) => {
  try {
    const nutrition = await Nutrition.findById(req.params.id);

    if (!nutrition) {
      return res.status(404).json({ message: 'Nutrition log not found' });
    }

    if (nutrition.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const { mealType, foods, date, notes } = req.body || {};

    if (mealType !== undefined) nutrition.mealType = mealType;
    if (notes !== undefined) nutrition.notes = notes;
    if (date !== undefined) nutrition.date = new Date(date);
    // Totals must never be taken from the client — always recomputed from the
    // entries so they cannot drift out of sync with foods[].
    if (foods !== undefined) {
      const { entries, totals } = await resolveFoods(foods, req.user._id);
      nutrition.foods = entries;
      nutrition.totals = totals;
    }

    await nutrition.save();
    await checkGoalsForUser(req.user._id, 'nutrition');

    res.json(nutrition);
  } catch (error) {
    next(error);
  }
};

// Delete Nutrition Log
export const deleteNutrition = async (req, res, next) => {
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
    next(error);
  }
};
