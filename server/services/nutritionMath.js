// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker backend by Munawwar).
// ============================================================================

// Single source of truth for turning a logged food entry into macros.
//
// Before this existed, calories were whatever number the user typed into a box:
// `quantity` and `unit` were stored but never multiplied by anything, and the
// dashboard's macro donut (4/4/9 kcal per gram) disagreed with the calorie ring
// (the raw typed field). Everything nutrition-related now routes through here.

// Grams per unit. `ml`/`l` are treated as water-equivalent (1 g/ml), which is
// the usual approximation for logging drinks; foods with a real density can
// carry their own `gramsPerServing` instead.
const UNIT_GRAMS = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
  ml: 1,
  l: 1000,
};

export const SUPPORTED_UNITS = [...Object.keys(UNIT_GRAMS), 'serving'];

// Atwater factors — kcal per gram of each macronutrient.
export const KCAL_PER_GRAM = { protein: 4, carbs: 4, fats: 9 };

export function caloriesFromMacros({ protein = 0, carbs = 0, fats = 0 } = {}) {
  return (
    n(protein) * KCAL_PER_GRAM.protein
    + n(carbs) * KCAL_PER_GRAM.carbs
    + n(fats) * KCAL_PER_GRAM.fats
  );
}

function n(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value, places = 1) {
  const factor = 10 ** places;
  return Math.round(n(value) * factor) / factor;
}

// Converts a logged quantity into grams. `serving` resolves against the food's
// own serving size, so "2 servings" works without the user knowing the weight.
export function toGrams(quantity, unit, food = null) {
  const amount = n(quantity);
  const key = String(unit || 'g').toLowerCase();

  if (key === 'serving' || key === 'servings') {
    const perServing = n(food?.gramsPerServing);
    // Without a known serving weight there is nothing to scale by; treat the
    // serving as the whole reference basis (100 units) rather than silently 0.
    return amount * (perServing > 0 ? perServing : 100);
  }

  const grams = UNIT_GRAMS[key];
  return grams ? amount * grams : amount;
}

// Resolves one logged entry into concrete macros.
//
// Two entry shapes are supported:
//   1. Referenced  — entry.food points at a Food doc; macros scale from its
//      per-100 basis by the logged quantity.
//   2. Custom      — no food reference; the user typed macros directly. Those
//      are read as totals for the entry as logged (not per 100), which matches
//      how people read a package label for the portion they ate.
//
// `food` is the resolved Food document (or null). Returns a plain object safe
// to persist as a Nutrition.foods[] subdocument.
export function resolveFoodEntry(entry = {}, food = null) {
  const quantity = n(entry.quantity);
  const unit = entry.unit || food?.basisUnit || 'g';
  const grams = toGrams(quantity, unit, food);

  let macros;
  let source;

  if (food) {
    // Per-100 basis scaled to the logged weight.
    const factor = grams / 100;
    macros = {
      calories: n(food.per100?.calories) * factor,
      protein: n(food.per100?.protein) * factor,
      carbs: n(food.per100?.carbs) * factor,
      fats: n(food.per100?.fats) * factor,
    };
    source = 'reference';
  } else {
    macros = {
      calories: n(entry.calories),
      protein: n(entry.protein),
      carbs: n(entry.carbs),
      fats: n(entry.fats),
    };
    source = 'custom';
  }

  // Reconcile the two calorie definitions instead of letting them disagree on
  // screen. If the entry carries macros but no calories, derive them; if both
  // are present we keep the stated calories and expose the macro-derived figure
  // so the UI can surface a mismatch rather than render two silent truths.
  const derived = caloriesFromMacros(macros);
  const hasMacros = macros.protein > 0 || macros.carbs > 0 || macros.fats > 0;
  if (!macros.calories && hasMacros) {
    macros.calories = derived;
  }

  return {
    food: food?._id ?? entry.food ?? undefined,
    name: entry.name || food?.name || 'Food',
    quantity,
    unit,
    grams: round(grams, 2),
    calories: round(macros.calories),
    protein: round(macros.protein),
    carbs: round(macros.carbs),
    fats: round(macros.fats),
    caloriesFromMacros: round(derived),
    source,
  };
}

// Sums resolved entries into meal totals. Also reports the macro-derived
// calorie figure so callers can show/flag a divergence.
export function sumEntries(entries = []) {
  const totals = entries.reduce((acc, entry) => ({
    calories: acc.calories + n(entry.calories),
    protein: acc.protein + n(entry.protein),
    carbs: acc.carbs + n(entry.carbs),
    fats: acc.fats + n(entry.fats),
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

  return {
    calories: round(totals.calories),
    protein: round(totals.protein),
    carbs: round(totals.carbs),
    fats: round(totals.fats),
    caloriesFromMacros: round(caloriesFromMacros(totals)),
  };
}

// Percentage of total calories contributed by each macro. Used by the dashboard
// donut, which previously computed this inline from unscaled macro sums.
export function macroSplit(totals = {}) {
  const parts = {
    protein: n(totals.protein) * KCAL_PER_GRAM.protein,
    carbs: n(totals.carbs) * KCAL_PER_GRAM.carbs,
    fats: n(totals.fats) * KCAL_PER_GRAM.fats,
  };
  const total = parts.protein + parts.carbs + parts.fats;
  if (!total) return { protein: 0, carbs: 0, fats: 0 };
  return {
    protein: Math.round((parts.protein / total) * 100),
    carbs: Math.round((parts.carbs / total) * 100),
    fats: Math.round((parts.fats / total) * 100),
  };
}

export default { resolveFoodEntry, sumEntries, macroSplit, caloriesFromMacros, toGrams, SUPPORTED_UNITS };
