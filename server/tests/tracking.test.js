// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker backend by Munawwar).
// ============================================================================

// Covers the calculation layer added on top of the original app: food-table
// portion scaling, stored meal totals, routine -> session tracking, workout
// volume, and value-based goals over time windows.

import 'dotenv/config';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import app from '../server.js';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Food from '../models/Food.js';
import Workout from '../models/Workout.js';
import Nutrition from '../models/Nutrition.js';
import Routine from '../models/Routine.js';
import Goal from '../models/Goal.js';
import Progress from '../models/Progress.js';

let server;
let base;
const createdUserIds = [];

function unique(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

async function api(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}

async function register(prefix = 'trk') {
  const u = unique(prefix);
  const { status, data } = await api('/api/auth/register', {
    method: 'POST',
    body: { username: u.slice(0, 28), name: 'Track User', email: `${u}@example.com`, password: 'secret123' },
  });
  assert.equal(status, 201, `register failed: ${JSON.stringify(data)}`);
  createdUserIds.push(data._id);
  return data;
}

before(async () => {
  await connectDB();
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (createdUserIds.length) {
    // Remove everything these test users produced.
    const filter = { user: { $in: createdUserIds } };
    await Promise.all([
      Workout.deleteMany(filter),
      Nutrition.deleteMany(filter),
      Routine.deleteMany(filter),
      Goal.deleteMany(filter),
      Progress.deleteMany(filter),
      Food.deleteMany({ owner: { $in: createdUserIds } }),
      User.deleteMany({ _id: { $in: createdUserIds } }),
    ]);
  }
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
});

// --- Food table ------------------------------------------------------------

test('seeded food table is searchable', async () => {
  const user = await register('food');
  const { status, data } = await api('/api/foods?search=chicken', { token: user.token });
  assert.equal(status, 200);
  assert.ok(data.items.length >= 1, 'chicken found in the seeded table');
  assert.ok(data.items[0].per100.calories > 0, 'food carries per-100 macros');
});

test('portion preview scales macros by the logged quantity', async () => {
  const user = await register('portion');
  const search = await api('/api/foods?search=Chicken breast', { token: user.token });
  const chicken = search.data.items[0];

  const preview = await api('/api/foods/preview', {
    method: 'POST',
    token: user.token,
    body: { foodId: chicken._id, quantity: 200, unit: 'g' },
  });

  assert.equal(preview.status, 200);
  assert.equal(preview.data.grams, 200);
  // The whole point of the fix: 200 g is twice the per-100 figure, not the
  // per-100 figure itself.
  const expected = Math.round(chicken.per100.calories * 2 * 10) / 10;
  assert.equal(preview.data.calories, expected, 'calories scaled by weight');
  assert.equal(preview.data.source, 'reference');
});

test('a user can add a private food, and it is not visible to others', async () => {
  const owner = await register('owner');
  const other = await register('other');

  const created = await api('/api/foods', {
    method: 'POST',
    token: owner.token,
    body: { name: unique('MyProteinShake'), per100: { calories: 380, protein: 75, carbs: 8, fats: 5 } },
  });
  assert.equal(created.status, 201);

  const mine = await api(`/api/foods/${created.data._id}`, { token: owner.token });
  assert.equal(mine.status, 200);

  const theirs = await api(`/api/foods/${created.data._id}`, { token: other.token });
  assert.equal(theirs.status, 404, 'private food hidden from other users');
});

// --- Nutrition totals ------------------------------------------------------

test('meal totals are computed server-side from the food table', async () => {
  const user = await register('meal');
  const search = await api('/api/foods?search=Rice, white, cooked', { token: user.token });
  const rice = search.data.items.find((food) => food.name.includes('cooked')) || search.data.items[0];

  const meal = await api('/api/nutrition', {
    method: 'POST',
    token: user.token,
    body: {
      mealType: 'lunch',
      foods: [
        { food: rice._id, quantity: 250, unit: 'g' },
        { name: 'Olive oil drizzle', quantity: 1, unit: 'g', protein: 0, carbs: 0, fats: 10 },
      ],
    },
  });

  assert.equal(meal.status, 201, JSON.stringify(meal.data));
  assert.equal(meal.data.foods.length, 2, 'both foods stored — arrays are no longer single-entry');

  const scaled = meal.data.foods[0];
  assert.equal(scaled.grams, 250);
  assert.equal(scaled.source, 'reference');
  assert.ok(scaled.calories > 0);

  // Calories derived from macros when not supplied (10 g fat = 90 kcal).
  const custom = meal.data.foods[1];
  assert.equal(custom.calories, 90, 'calories derived from macros via 4/4/9');

  // Stored totals match the sum of entries.
  const expected = Math.round((scaled.calories + custom.calories) * 10) / 10;
  assert.equal(meal.data.totals.calories, expected, 'totals persisted on the document');
});

test('daily summary reports consumed vs. target', async () => {
  const user = await register('summary');
  await api('/api/nutrition', {
    method: 'POST',
    token: user.token,
    body: { mealType: 'breakfast', foods: [{ name: 'Toast', quantity: 100, unit: 'g', calories: 265, protein: 9, carbs: 49, fats: 3 }] },
  });

  const { status, data } = await api('/api/nutrition/summary', { token: user.token });
  assert.equal(status, 200);
  assert.equal(data.consumed.calories, 265);
  assert.ok(data.targets.calories > 0, 'targets present');
  assert.equal(data.remaining.calories, Math.round(data.targets.calories - 265));
  assert.equal(data.byMealType.breakfast.count, 1);
  assert.equal(data.byMealType.dinner.count, 0);
});

test('targets are derived from body stats rather than hardcoded', async () => {
  const user = await register('targets');

  const before = await api('/api/users/targets', { token: user.token });
  assert.equal(before.data.source, 'default');
  assert.equal(before.data.needsBodyStats, true);

  await api('/api/progress', { method: 'POST', token: user.token, body: { weight: 80 } });
  await api('/api/users', {
    method: 'PUT',
    token: user.token,
    body: { bodyStats: { heightCm: 180, birthDate: '2000-01-01', sex: 'male', activityLevel: 'moderate', goal: 'maintain' } },
  });

  const after = await api('/api/users/targets', { token: user.token });
  assert.equal(after.data.source, 'derived');
  assert.ok(after.data.basis.bmr > 1500 && after.data.basis.bmr < 2200, `BMR in range: ${after.data.basis.bmr}`);
  assert.notEqual(after.data.calories, before.data.calories, 'targets changed once stats were known');
  assert.ok(after.data.protein > 0);
});

// --- Routines and sessions -------------------------------------------------

test('routine can be created, started, tracked set by set, and completed', async () => {
  const user = await register('routine');

  const routine = await api('/api/routines', {
    method: 'POST',
    token: user.token,
    body: {
      name: 'Push Day',
      category: 'strength',
      exercises: [
        { name: 'Bench press', targetSets: 3, targetReps: 8, targetWeight: 60, restSeconds: 120 },
        { name: 'Overhead press', targetSets: 2, targetReps: 10, targetWeight: 30 },
      ],
    },
  });
  assert.equal(routine.status, 201, JSON.stringify(routine.data));
  assert.equal(routine.data.exercises.length, 2);

  // Starting builds a session with an empty, tickable set log.
  const started = await api(`/api/routines/${routine.data._id}/start`, { method: 'POST', token: user.token });
  assert.equal(started.status, 201);
  const workout = started.data;
  assert.equal(workout.status, 'active');
  assert.ok(workout.startedAt, 'session timestamped');
  assert.equal(workout.exercises[0].setLog.length, 3, 'set log pre-built from the plan');
  assert.equal(workout.exercises[0].setLog[0].completed, false);
  assert.equal(workout.summary.plannedSets, 5);
  assert.equal(workout.summary.completedSets, 0);

  // Only one session at a time.
  const second = await api(`/api/routines/${routine.data._id}/start`, { method: 'POST', token: user.token });
  assert.equal(second.status, 409, 'a second concurrent session is refused');
  assert.equal(second.data.workout._id, workout._id, 'the running session is handed back');

  // The active session is resumable.
  const active = await api('/api/workouts/active', { token: user.token });
  assert.equal(active.status, 200);
  assert.equal(active.data._id, workout._id);

  // Tick the first set with actuals that differ from the plan.
  const exercise = workout.exercises[0];
  const logged = await api(
    `/api/workouts/${workout._id}/exercises/${exercise._id}/sets/${exercise.setLog[0]._id}`,
    { method: 'PUT', token: user.token, body: { reps: 8, weight: 62.5, completed: true } },
  );
  assert.equal(logged.status, 200);
  assert.equal(logged.data.exercises[0].setLog[0].completed, true);
  assert.equal(logged.data.summary.completedSets, 1);
  assert.equal(logged.data.summary.volume, 500, '8 reps x 62.5 kg');

  // An extra set can be added mid-session.
  const added = await api(
    `/api/workouts/${workout._id}/exercises/${exercise._id}/sets`,
    { method: 'POST', token: user.token, body: { reps: 6, weight: 65 } },
  );
  assert.equal(added.status, 201);
  assert.equal(added.data.exercises[0].setLog.length, 4);
  assert.equal(added.data.summary.plannedSets, 6);

  const finished = await api(`/api/workouts/${workout._id}/complete`, { method: 'POST', token: user.token });
  assert.equal(finished.status, 200);
  assert.equal(finished.data.status, 'completed');
  assert.ok(finished.data.completedAt);
  assert.ok(finished.data.durationSeconds >= 0);

  // Completing again is refused.
  const recomplete = await api(`/api/workouts/${workout._id}/complete`, { method: 'POST', token: user.token });
  assert.equal(recomplete.status, 409);

  // The routine's counters moved.
  const routines = await api('/api/routines', { token: user.token });
  assert.equal(routines.data[0].timesPerformed, 1);
  assert.ok(routines.data[0].lastPerformedAt);

  // And no session is active any more.
  const none = await api('/api/workouts/active', { token: user.token });
  assert.equal(none.status, 204);
});

test('directly logged workouts still get a volume summary', async () => {
  const user = await register('legacy');
  const { status, data } = await api('/api/workouts', {
    method: 'POST',
    token: user.token,
    body: { name: 'Quick log', category: 'strength', exercises: [{ name: 'Squat', sets: 5, reps: 5, weight: 100 }] },
  });

  assert.equal(status, 201);
  assert.equal(data.status, 'completed');
  assert.equal(data.summary.volume, 2500, '5 x 5 x 100');
  assert.equal(data.summary.completedSets, 5);
});

// --- Goals -----------------------------------------------------------------

test('calorie goals measure calories, not the number of log entries', async () => {
  const user = await register('caloriegoal');

  const goal = await api('/api/goals', {
    method: 'POST',
    token: user.token,
    body: { title: 'Eat 500 kcal today', metric: 'calories', target: 500, period: 'daily' },
  });
  assert.equal(goal.status, 201);
  assert.equal(goal.data.achieved, false);
  assert.equal(goal.data.current, 0);

  // One meal worth far more than 1 "record" but under target.
  await api('/api/nutrition', {
    method: 'POST',
    token: user.token,
    body: { mealType: 'lunch', foods: [{ name: 'Snack', quantity: 100, unit: 'g', calories: 300 }] },
  });

  let goals = await api('/api/goals', { token: user.token });
  assert.equal(goals.data[0].current, 300, 'measured in calories');
  assert.equal(goals.data[0].achieved, false, 'not met at 300 of 500');
  assert.equal(goals.data[0].progressPercent, 60);

  await api('/api/nutrition', {
    method: 'POST',
    token: user.token,
    body: { mealType: 'dinner', foods: [{ name: 'Meal', quantity: 100, unit: 'g', calories: 250 }] },
  });

  goals = await api('/api/goals', { token: user.token });
  assert.equal(goals.data[0].current, 550);
  assert.equal(goals.data[0].achieved, true, 'achieved once real calories crossed the target');
});

test('weight goals are auto-checked when progress is logged', async () => {
  const user = await register('weightgoal');

  const goal = await api('/api/goals', {
    method: 'POST',
    token: user.token,
    body: { title: 'Cut to 75kg', metric: 'weight', target: 75, direction: 'decrease' },
  });
  assert.equal(goal.data.achieved, false);

  await api('/api/progress', { method: 'POST', token: user.token, body: { weight: 80 } });
  let goals = await api('/api/goals', { token: user.token });
  assert.equal(goals.data[0].achieved, false, 'still above target');

  await api('/api/progress', { method: 'POST', token: user.token, body: { weight: 74.5 } });
  goals = await api('/api/goals', { token: user.token });
  // Previously progressController passed 'progress' as a metric name, which
  // matched nothing, so weight goals never fired.
  assert.equal(goals.data[0].achieved, true, 'weight goal auto-achieved on progress write');
});

test('volume goals sum training volume', async () => {
  const user = await register('volumegoal');

  await api('/api/goals', {
    method: 'POST',
    token: user.token,
    body: { title: 'Move 5000kg', metric: 'volume', target: 5000, period: 'weekly' },
  });

  await api('/api/workouts', {
    method: 'POST',
    token: user.token,
    body: { name: 'Heavy', category: 'strength', exercises: [{ name: 'Deadlift', sets: 5, reps: 5, weight: 120 }] },
  });

  const goals = await api('/api/goals', { token: user.token });
  assert.equal(goals.data[0].current, 3000, '5 x 5 x 120');
  assert.equal(goals.data[0].achieved, false);

  await api('/api/workouts', {
    method: 'POST',
    token: user.token,
    body: { name: 'Heavy 2', category: 'strength', exercises: [{ name: 'Squat', sets: 5, reps: 5, weight: 100 }] },
  });

  const after = await api('/api/goals', { token: user.token });
  assert.equal(after.data[0].current, 5500);
  assert.equal(after.data[0].achieved, true);
});
