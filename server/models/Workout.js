// ============================================================================
// Original author: Munawwar (base Fitness Tracker backend).
// Modified by: Abdullah — turned into a trackable session (routine link, status,
// timing, per-set actuals, denormalised volume) while keeping the original
// flat log shape working.
// ============================================================================

import mongoose from 'mongoose';

// One performed set. `completed` is what the tick box in the session view sets;
// reps/weight start from the routine's targets and are edited to the actuals.
const setEntrySchema = new mongoose.Schema({
  setNumber: { type: Number, required: true },
  reps: { type: Number, default: 0, min: 0 },
  weight: { type: Number, default: 0, min: 0 },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date },
}, { _id: true });

// `sets`/`reps`/`weight` are the original flat fields and are retained: older
// records still carry them, and they act as the plan when no setLog exists.
// `setLog` holds the per-set actuals that make a session trackable.
const workoutExerciseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sets: { type: Number },
  reps: { type: Number },
  weight: { type: Number },
  notes: { type: String },
  order: { type: Number, default: 0 },
  restSeconds: { type: Number, default: 90 },
  targetSets: { type: Number },
  targetReps: { type: Number },
  targetWeight: { type: Number },
  setLog: [setEntrySchema],
}, { _id: true });

const workoutSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Set when the session was started from a saved template.
  routine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Routine',
  },
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['strength', 'cardio', 'flexibility', 'other'],
    default: 'other'
  },
  // Defaults to `completed` so a directly-logged workout (the original
  // behaviour, and what the existing API contract does) is immediately a
  // finished record. Sessions started from a routine begin as `active`.
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned'],
    default: 'completed',
    index: true,
  },
  exercises: [workoutExerciseSchema],
  tags: [String],
  startedAt: { type: Date },
  completedAt: { type: Date },
  durationSeconds: { type: Number, default: 0 },
  // Denormalised by services/workoutMath.js on every write.
  summary: {
    volume: { type: Number, default: 0 },
    plannedSets: { type: Number, default: 0 },
    completedSets: { type: Number, default: 0 },
    completionPercent: { type: Number, default: 0 },
    exerciseCount: { type: Number, default: 0 },
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

workoutSchema.index({ user: 1, date: -1 });
// Finding the one in-flight session is a hot path for the session view.
workoutSchema.index({ user: 1, status: 1 });

export default mongoose.model('Workout', workoutSchema);
