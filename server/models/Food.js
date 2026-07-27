// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker backend by Munawwar).
// ============================================================================

import mongoose from 'mongoose';

// Reference food table. Nutrition logs point at these so a portion can be
// scaled instead of the user typing calories from memory.
//
// Macros are always stored per 100 base units (`basisUnit`), which is how
// nutrition labels are published and what makes scaling by an arbitrary logged
// quantity possible.
const foodSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  brand: {
    type: String,
    trim: true,
    maxlength: 80,
    default: '',
  },
  category: {
    type: String,
    enum: ['protein', 'carb', 'vegetable', 'fruit', 'dairy', 'fat', 'drink', 'snack', 'meal', 'other'],
    default: 'other',
  },
  basisUnit: {
    type: String,
    enum: ['g', 'ml'],
    default: 'g',
  },
  per100: {
    calories: { type: Number, required: true, min: 0 },
    protein: { type: Number, default: 0, min: 0 },
    carbs: { type: Number, default: 0, min: 0 },
    fats: { type: Number, default: 0, min: 0 },
  },
  // Weight of one "serving", so users can log `2 servings` without knowing grams.
  gramsPerServing: {
    type: Number,
    min: 0,
  },
  servingLabel: {
    type: String,
    trim: true,
    maxlength: 40,
  },
  // null owner = shipped/global food available to everyone. A user-created food
  // is private to its owner.
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  verified: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

// Search index for the food picker's type-ahead.
foodSchema.index({ name: 'text', brand: 'text' });
// Prevents duplicate global entries for the same product.
foodSchema.index({ name: 1, brand: 1, owner: 1 }, { unique: true });

export default mongoose.model('Food', foodSchema);
