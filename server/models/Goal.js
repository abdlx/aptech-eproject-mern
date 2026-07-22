// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker backend by Munawwar).
// ============================================================================

import mongoose from 'mongoose';

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
  // What the goal counts toward. `workout`/`nutrition` count logged records;
  // `weight` targets a body weight from the latest progress entry.
  metric: {
    type: String,
    enum: ['workout', 'nutrition', 'weight'],
    required: true,
  },
  target: {
    type: Number,
    required: true,
  },
  // For `weight`, whether reaching-or-below (lose) or reaching-or-above (gain) counts.
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
