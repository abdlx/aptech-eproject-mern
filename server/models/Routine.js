// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker backend by Munawwar).
// ============================================================================

import mongoose from 'mongoose';

// A reusable workout *template*. Previously the app had no such concept: a
// "workout" was only ever a finished log record, so there was nothing to start,
// repeat, or track exercises against. A Routine holds the plan; starting one
// creates a Workout session that carries the actuals.
const routineExerciseSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  targetSets: { type: Number, default: 3, min: 0, max: 50 },
  targetReps: { type: Number, default: 10, min: 0, max: 500 },
  targetWeight: { type: Number, default: 0, min: 0 },
  // Prescribed rest between sets, surfaced by the session timer.
  restSeconds: { type: Number, default: 90, min: 0, max: 3600 },
  notes: { type: String, maxlength: 300 },
  order: { type: Number, default: 0 },
}, { _id: true });

const routineSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  description: {
    type: String,
    maxlength: 500,
  },
  category: {
    type: String,
    enum: ['strength', 'cardio', 'flexibility', 'other'],
    default: 'strength',
  },
  exercises: {
    type: [routineExerciseSchema],
    validate: {
      validator: (list) => list.length > 0,
      message: 'A routine needs at least one exercise',
    },
  },
  tags: [String],
  // Kept rather than deleted so historical sessions keep a valid reference.
  isArchived: {
    type: Boolean,
    default: false,
  },
  lastPerformedAt: {
    type: Date,
  },
  timesPerformed: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

routineSchema.index({ user: 1, isArchived: 1, updatedAt: -1 });

export default mongoose.model('Routine', routineSchema);
