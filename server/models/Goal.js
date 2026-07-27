// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker backend by Munawwar).
// ============================================================================

import mongoose from 'mongoose';

// Metrics fall into two families:
//   counts  — how many records exist (`workout`, `nutrition`, `sessions`)
//   values  — the sum/level of an actual quantity (`calories`, `protein`,
//             `volume`, `weight`)
// Originally every non-weight goal was a count, so a "2000 calorie" goal
// silently meant "2000 nutrition log entries". The value metrics fix that.
export const GOAL_METRICS = [
  'workout',
  'nutrition',
  'weight',
  'calories',
  'protein',
  'volume',
  'sessions',
];

// A count/sum metric is meaningless without a window — a lifetime total can
// never express "2000 kcal a day". `total` preserves the original behaviour.
export const GOAL_PERIODS = ['total', 'daily', 'weekly', 'monthly'];

const goalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  metric: {
    type: String,
    enum: GOAL_METRICS,
    required: true,
  },
  target: {
    type: Number,
    required: true,
  },
  period: {
    type: String,
    enum: GOAL_PERIODS,
    default: 'total',
  },
  // For `weight`, whether reaching-or-below (lose) or reaching-or-above (gain)
  // counts. Also applies to value metrics: a `decrease` calorie goal is a cap
  // ("stay under 2000"), an `increase` one is a floor ("hit 150g protein").
  direction: {
    type: String,
    enum: ['increase', 'decrease'],
    default: 'increase',
  },
  achieved: {
    type: Boolean,
    default: false,
  },
  achievedAt: {
    type: Date,
  },
  deadline: {
    type: Date,
  },
}, { timestamps: true });

export default mongoose.model('Goal', goalSchema);
