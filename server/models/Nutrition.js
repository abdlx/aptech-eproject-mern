// ============================================================================
// Original author: Munawwar (base Fitness Tracker backend).
// Modified by: Abdullah — food-table references, gram resolution, stored totals.
// ============================================================================

import mongoose from 'mongoose';

// One logged food within a meal. `quantity`/`unit` are what the user entered;
// `grams`, `calories` and the macros are *resolved* values computed by
// services/nutritionMath.js — either scaled from the referenced Food's per-100
// basis, or taken verbatim for a one-off custom entry.
const foodEntrySchema = new mongoose.Schema({
  food: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Food',
  },
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, default: 'g' },
  // Normalised weight the macros below were computed from.
  grams: { type: Number, default: 0 },
  calories: { type: Number, default: 0 },
  protein: { type: Number, default: 0 },
  carbs: { type: Number, default: 0 },
  fats: { type: Number, default: 0 },
  // Atwater cross-check (4/4/9). Lets the UI flag a label whose stated calories
  // disagree with its macros instead of showing two numbers that never match.
  caloriesFromMacros: { type: Number, default: 0 },
  source: {
    type: String,
    enum: ['reference', 'custom'],
    default: 'custom',
  },
}, { _id: true });

const nutritionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mealType: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'snack'],
    required: true
  },
  foods: [foodEntrySchema],
  // Denormalised so dashboards, reports and goals do not each re-walk foods[].
  // Recomputed on every write by the controller.
  totals: {
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fats: { type: Number, default: 0 },
    caloriesFromMacros: { type: Number, default: 0 },
  },
  notes: {
    type: String,
    maxlength: 500,
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Daily/period rollups scan by user + date constantly (dashboard, goals).
nutritionSchema.index({ user: 1, date: -1 });

export default mongoose.model('Nutrition', nutritionSchema);
