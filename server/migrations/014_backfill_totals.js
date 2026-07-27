import Workout from '../models/Workout.js';
import Nutrition from '../models/Nutrition.js';
import { summarise } from '../services/workoutMath.js';
import { sumEntries } from '../services/nutritionMath.js';

// Backfills the denormalised fields introduced alongside the calculation layer.
//
// Existing records predate `Nutrition.totals` and `Workout.summary`, so without
// this the dashboard, goals and reports would read zeros for all historical
// data. Volume/completion for old workouts is derived from the flat
// sets/reps/weight numbers, which is all those records ever had.
export const name = '014_backfill_totals';

export async function up() {
  let mealsUpdated = 0;
  const meals = await Nutrition.find({});
  for (const meal of meals) {
    meal.totals = sumEntries(meal.foods || []);
    // Older entries have no resolved gram weight; record what we can infer so
    // the field is not misleadingly empty.
    for (const entry of meal.foods || []) {
      if (!entry.grams && entry.unit === 'g') entry.grams = entry.quantity || 0;
      if (!entry.source) entry.source = 'custom';
    }
    await meal.save();
    mealsUpdated += 1;
  }

  let workoutsUpdated = 0;
  const workouts = await Workout.find({});
  for (const workout of workouts) {
    if (!workout.status) workout.status = 'completed';
    if (!workout.completedAt) workout.completedAt = workout.date;
    workout.summary = summarise(workout);
    await workout.save();
    workoutsUpdated += 1;
  }

  console.log(`  backfilled ${mealsUpdated} meal(s) and ${workoutsUpdated} workout(s)`);
}

export async function down() {
  // Purely derived data — clearing it is safe and the fields simply return to
  // their schema defaults.
  await Nutrition.updateMany({}, { $unset: { totals: '' } });
  await Workout.updateMany({}, { $unset: { summary: '' } });
}
