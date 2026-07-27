// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker backend by Munawwar).
// ============================================================================

import Progress from '../models/Progress.js';

// Daily nutrition targets. The dashboard used to hardcode 2,200 kcal and 140 g
// protein for every user; these are now either set explicitly on the profile or
// derived from the user's body stats and latest logged weight.

// Mifflin-St Jeor is the usual default for resting energy expenditure.
export function basalMetabolicRate({ weightKg, heightCm, age, sex }) {
  if (!weightKg || !heightCm || !age) return null;
  const base = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
  return sex === 'female' ? base - 161 : base + 5;
}

export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const GOAL_ADJUSTMENTS = {
  lose: -0.20,   // ~20% deficit
  maintain: 0,
  gain: 0.15,    // ~15% surplus
};

export function ageFromBirthDate(birthDate) {
  if (!birthDate) return null;
  const born = new Date(birthDate);
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const monthDelta = now.getMonth() - born.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < born.getDate())) age -= 1;
  return age > 0 && age < 120 ? age : null;
}

// Splits a calorie budget into macro grams. Protein is anchored to body weight
// (the figure that actually matters for training), fat to a share of calories,
// and carbs take the remainder.
export function macroTargets(calories, weightKg, goal = 'maintain') {
  const proteinPerKg = goal === 'lose' ? 2.2 : goal === 'gain' ? 1.8 : 2.0;
  const protein = weightKg ? Math.round(weightKg * proteinPerKg) : Math.round((calories * 0.30) / 4);
  const fats = Math.round((calories * 0.25) / 9);
  const remaining = calories - (protein * 4) - (fats * 9);
  const carbs = Math.max(0, Math.round(remaining / 4));
  return { protein, carbs, fats };
}

// Resolves the targets to show a user.
//
// Order of precedence:
//   1. Explicit values saved on the profile (autoCalculate off)
//   2. Derived from body stats + latest logged weight
//   3. Generic fallback, flagged so the UI can prompt for body stats
export async function resolveTargets(user) {
  const stats = user?.bodyStats || {};
  const saved = user?.nutritionTargets || {};

  if (saved.autoCalculate === false && saved.calories) {
    return {
      calories: saved.calories,
      protein: saved.protein ?? 0,
      carbs: saved.carbs ?? 0,
      fats: saved.fats ?? 0,
      source: 'manual',
    };
  }

  const latest = await Progress.findOne({ user: user._id }).sort({ date: -1 }).select('weight');
  const weightKg = latest?.weight || stats.weightKg || null;
  const age = ageFromBirthDate(stats.birthDate);
  const bmr = basalMetabolicRate({ weightKg, heightCm: stats.heightCm, age, sex: stats.sex });

  if (!bmr) {
    return {
      calories: 2000,
      protein: 120,
      carbs: 220,
      fats: 65,
      source: 'default',
      // Tells the client to prompt for height/DOB/weight rather than presenting
      // a generic number as if it were personalised.
      needsBodyStats: true,
    };
  }

  const multiplier = ACTIVITY_MULTIPLIERS[stats.activityLevel] ?? ACTIVITY_MULTIPLIERS.moderate;
  const adjustment = GOAL_ADJUSTMENTS[stats.goal] ?? 0;
  const calories = Math.round((bmr * multiplier) * (1 + adjustment));

  return {
    calories,
    ...macroTargets(calories, weightKg, stats.goal),
    source: 'derived',
    basis: {
      bmr: Math.round(bmr),
      tdee: Math.round(bmr * multiplier),
      weightKg,
      activityLevel: stats.activityLevel || 'moderate',
      goal: stats.goal || 'maintain',
    },
  };
}

export default { resolveTargets, basalMetabolicRate, macroTargets, ageFromBirthDate };
