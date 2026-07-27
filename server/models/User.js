// ============================================================================
// Original author: Munawwar (base Fitness Tracker backend).
// Modified by: Abdullah — added features on top (see AUTHORS.md for what changed).
// ============================================================================

import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 30
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  profilePicture: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  emailVerificationExpires: {
    type: Date,
    select: false
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  preferences: {
    units: { type: String, default: 'metric' },
    theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
    notificationsEnabled: { type: Boolean, default: true }
  },
  // Inputs for deriving daily calorie/macro targets (services/targetService.js).
  // Weight is not stored here — it comes from the latest Progress entry so the
  // targets track the user's actual logged weight.
  bodyStats: {
    heightCm: { type: Number, min: 50, max: 260 },
    birthDate: { type: Date },
    sex: { type: String, enum: ['male', 'female', 'unspecified'], default: 'unspecified' },
    activityLevel: {
      type: String,
      enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'],
      default: 'moderate',
    },
    goal: {
      type: String,
      enum: ['lose', 'maintain', 'gain'],
      default: 'maintain',
    },
  },
  // Explicit overrides. While autoCalculate is true the values below are
  // ignored and targets are derived from bodyStats instead.
  nutritionTargets: {
    autoCalculate: { type: Boolean, default: true },
    calories: { type: Number, min: 0 },
    protein: { type: Number, min: 0 },
    carbs: { type: Number, min: 0 },
    fats: { type: Number, min: 0 },
  }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
