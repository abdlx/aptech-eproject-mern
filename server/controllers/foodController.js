// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker backend by Munawwar).
// ============================================================================

import Food from '../models/Food.js';
import { resolveFoodEntry } from '../services/nutritionMath.js';
import { paginate, buildMeta } from '../utils/pagination.js';

// Foods visible to a user: the shipped global table plus their own additions.
function visibleTo(userId) {
  return { $or: [{ owner: null }, { owner: userId }] };
}

// Search the food table. Backs the log-meal type-ahead, so it is ordered to put
// exact prefix matches first and stays cheap enough to call per keystroke.
export const searchFoods = async (req, res, next) => {
  try {
    const { search = '', category } = req.query;
    const query = visibleTo(req.user._id);
    if (category) query.category = category;

    if (search.trim()) {
      // Regex rather than $text: it supports prefix matching on partial words,
      // which is what a type-ahead needs ("chi" -> "Chicken breast").
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$and = [{ $or: [
        { name: { $regex: escaped, $options: 'i' } },
        { brand: { $regex: escaped, $options: 'i' } },
      ] }];
    }

    const { page, limit, skip } = paginate({ limit: req.query.limit || 25, page: req.query.page });
    const [items, total] = await Promise.all([
      Food.find(query).sort({ verified: -1, name: 1 }).skip(skip).limit(limit),
      Food.countDocuments(query),
    ]);

    res.json({ items, meta: buildMeta(total, page, limit) });
  } catch (error) {
    next(error);
  }
};

export const getFood = async (req, res, next) => {
  try {
    const food = await Food.findOne({ _id: req.params.id, ...visibleTo(req.user._id) });
    if (!food) return res.status(404).json({ message: 'Food not found' });
    res.json(food);
  } catch (error) {
    next(error);
  }
};

// Creates a private food for the current user. Global foods are seeded by
// migration, never through the API.
export const createFood = async (req, res, next) => {
  try {
    const { name, brand, category, basisUnit, per100, gramsPerServing, servingLabel } = req.body || {};

    if (!name || !per100 || per100.calories === undefined) {
      return res.status(400).json({ message: 'name and per100.calories are required' });
    }

    const food = await Food.create({
      name,
      brand,
      category,
      basisUnit,
      per100: {
        calories: per100.calories,
        protein: per100.protein || 0,
        carbs: per100.carbs || 0,
        fats: per100.fats || 0,
      },
      gramsPerServing,
      servingLabel,
      owner: req.user._id,
    });

    res.status(201).json(food);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'You already have a food with that name and brand' });
    }
    next(error);
  }
};

export const updateFood = async (req, res, next) => {
  try {
    // Only the owner's own foods are editable; the global table is read-only.
    const food = await Food.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      req.body,
      { new: true, runValidators: true },
    );
    if (!food) return res.status(404).json({ message: 'Food not found or not editable' });
    res.json(food);
  } catch (error) {
    next(error);
  }
};

export const deleteFood = async (req, res, next) => {
  try {
    const food = await Food.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!food) return res.status(404).json({ message: 'Food not found or not editable' });
    res.json({ message: 'Food removed' });
  } catch (error) {
    next(error);
  }
};

// Previews the macros for a portion without logging it — lets the meal form
// show live numbers as the user types a quantity, using the same maths the
// server will apply on save.
export const previewPortion = async (req, res, next) => {
  try {
    const { foodId, quantity, unit } = req.body || {};
    if (quantity === undefined) {
      return res.status(400).json({ message: 'quantity is required' });
    }

    let food = null;
    if (foodId) {
      food = await Food.findOne({ _id: foodId, ...visibleTo(req.user._id) });
      if (!food) return res.status(404).json({ message: 'Food not found' });
    }

    res.json(resolveFoodEntry({ ...req.body, quantity, unit }, food));
  } catch (error) {
    next(error);
  }
};
