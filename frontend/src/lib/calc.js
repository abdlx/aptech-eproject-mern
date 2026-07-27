// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker frontend by Munawwar).
// ============================================================================

// Client-side mirror of server/services/nutritionMath.js and workoutMath.js.
//
// The server is authoritative — everything persisted is computed there. These
// exist so forms can show live numbers as the user types without a round trip,
// and so the five separate inline `reduce`s that used to recompute calories in
// main.jsx all read from one place.

export function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export const KCAL_PER_GRAM = { protein: 4, carbs: 4, fats: 9 };

const UNIT_GRAMS = {
  g: 1, gram: 1, grams: 1, kg: 1000, oz: 28.3495, lb: 453.592, ml: 1, l: 1000,
};

export const UNIT_OPTIONS = ['g', 'ml', 'oz', 'lb', 'kg', 'serving'];

export function caloriesFromMacros({ protein = 0, carbs = 0, fats = 0 } = {}) {
  return num(protein) * 4 + num(carbs) * 4 + num(fats) * 9;
}

export function toGrams(quantity, unit, food = null) {
  const amount = num(quantity);
  const key = String(unit || 'g').toLowerCase();
  if (key === 'serving' || key === 'servings') {
    const perServing = num(food?.gramsPerServing);
    return amount * (perServing > 0 ? perServing : 100);
  }
  return UNIT_GRAMS[key] ? amount * UNIT_GRAMS[key] : amount;
}

function round(value, places = 1) {
  const factor = 10 ** places;
  return Math.round(num(value) * factor) / factor;
}

// Scales a food-table entry to the logged portion, or reads a custom entry's
// typed macros verbatim. Mirrors resolveFoodEntry on the server.
export function resolveEntry(entry = {}, food = null) {
  const grams = toGrams(entry.quantity, entry.unit, food);
  let macros;

  if (food) {
    const factor = grams / 100;
    macros = {
      calories: num(food.per100?.calories) * factor,
      protein: num(food.per100?.protein) * factor,
      carbs: num(food.per100?.carbs) * factor,
      fats: num(food.per100?.fats) * factor,
    };
  } else {
    macros = {
      calories: num(entry.calories),
      protein: num(entry.protein),
      carbs: num(entry.carbs),
      fats: num(entry.fats),
    };
  }

  const derived = caloriesFromMacros(macros);
  if (!macros.calories && derived) macros.calories = derived;

  return {
    grams: round(grams, 2),
    calories: round(macros.calories),
    protein: round(macros.protein),
    carbs: round(macros.carbs),
    fats: round(macros.fats),
    caloriesFromMacros: round(derived),
  };
}

// Sums anything carrying calories/protein/carbs/fats — food entries, meal
// totals, or a mix.
export function sumMacros(items = []) {
  const totals = items.reduce((acc, item) => ({
    calories: acc.calories + num(item?.calories),
    protein: acc.protein + num(item?.protein),
    carbs: acc.carbs + num(item?.carbs),
    fats: acc.fats + num(item?.fats),
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

  return {
    calories: round(totals.calories),
    protein: round(totals.protein),
    carbs: round(totals.carbs),
    fats: round(totals.fats),
  };
}

// A meal's totals: prefers the server-stored figure, falling back to summing
// entries for records written before totals were persisted.
export function mealTotals(meal = {}) {
  if (meal.totals && meal.totals.calories !== undefined) return meal.totals;
  return sumMacros(meal.foods || []);
}

// Totals across many meals.
export function totalsFor(meals = []) {
  return sumMacros(meals.map(mealTotals));
}

// Percentage of calories from each macro, for the dashboard donut. Previously
// computed inline from unscaled macro sums, which disagreed with the calorie
// ring right next to it.
export function macroSplit(totals = {}) {
  const parts = {
    protein: num(totals.protein) * 4,
    carbs: num(totals.carbs) * 4,
    fats: num(totals.fats) * 9,
  };
  const total = parts.protein + parts.carbs + parts.fats;
  if (!total) return { protein: 0, carbs: 0, fats: 0 };
  return {
    protein: Math.round((parts.protein / total) * 100),
    carbs: Math.round((parts.carbs / total) * 100),
    fats: Math.round((parts.fats / total) * 100),
  };
}

// --- Workout ---------------------------------------------------------------

export function exerciseVolume(exercise = {}) {
  const log = exercise.setLog || [];
  if (log.length) {
    return log.filter((set) => set.completed)
      .reduce((sum, set) => sum + num(set.reps) * num(set.weight), 0);
  }
  return num(exercise.sets) * num(exercise.reps) * num(exercise.weight);
}

export function workoutVolume(workout = {}) {
  if (workout.summary?.volume !== undefined) return workout.summary.volume;
  return (workout.exercises || []).reduce((sum, ex) => sum + exerciseVolume(ex), 0);
}

export function setCounts(workout = {}) {
  if (workout.summary?.plannedSets !== undefined) {
    return { planned: workout.summary.plannedSets, completed: workout.summary.completedSets };
  }
  return (workout.exercises || []).reduce((acc, exercise) => {
    const log = exercise.setLog || [];
    const planned = log.length || num(exercise.targetSets) || num(exercise.sets);
    const completed = log.length ? log.filter((s) => s.completed).length : num(exercise.sets);
    return { planned: acc.planned + planned, completed: acc.completed + completed };
  }, { planned: 0, completed: 0 });
}

// Latest body weight. Does not assume the array is already sorted — the
// dashboard used to read progress[0] and would show a stale figure whenever it
// was not.
export function latestWeight(progress = []) {
  const withWeight = progress.filter((entry) => num(entry.weight) > 0);
  if (!withWeight.length) return 0;
  return withWeight.reduce((latest, entry) => (
    new Date(entry.date) > new Date(latest.date) ? entry : latest
  )).weight;
}

export function formatDuration(seconds) {
  const total = Math.max(0, Math.round(num(seconds)));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
