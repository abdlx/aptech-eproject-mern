// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker backend by Munawwar).
// ============================================================================

import mongoose from 'mongoose';
import Goal from '../models/Goal.js';
import Workout from '../models/Workout.js';
import Nutrition from '../models/Nutrition.js';
import Progress from '../models/Progress.js';
import { notify } from './notificationService.js';

// Which goal metrics a given write should re-evaluate. Callers pass the source
// they just wrote ('workout' | 'nutrition' | 'progress'); previously
// progressController passed 'progress', which matched no metric at all, so
// weight goals were never auto-checked.
const METRICS_BY_SOURCE = {
  workout: ['workout', 'sessions', 'volume'],
  nutrition: ['nutrition', 'calories', 'protein'],
  progress: ['weight'],
};

// Start/end of the window a periodic goal is measured over. `total` means
// all-time, so no date filter is applied.
export function periodRange(period, now = new Date()) {
  if (!period || period === 'total') return null;

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === 'weekly') {
    // Week starts Monday.
    const weekday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - weekday);
  } else if (period === 'monthly') {
    start.setDate(1);
  }

  const end = new Date(start);
  if (period === 'daily') end.setDate(end.getDate() + 1);
  else if (period === 'weekly') end.setDate(end.getDate() + 7);
  else if (period === 'monthly') end.setMonth(end.getMonth() + 1);

  return { start, end };
}

function dateFilter(period) {
  const range = periodRange(period);
  return range ? { date: { $gte: range.start, $lt: range.end } } : {};
}

// Sums a numeric field across matching documents.
async function sumField(Model, match, field) {
  const [row] = await Model.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: `$${field}` } } },
  ]);
  return row?.total ?? 0;
}

// Current value for a goal's metric, measured over its period.
export async function currentValue(userId, goal) {
  const user = new mongoose.Types.ObjectId(String(userId));
  const window = dateFilter(goal.period);

  switch (goal.metric) {
    case 'workout':
      return Workout.countDocuments({ user: userId, ...window });

    case 'sessions':
      // Only sessions actually finished count toward a session goal.
      return Workout.countDocuments({ user: userId, status: 'completed', ...window });

    case 'volume':
      return sumField(Workout, { user, ...window }, 'summary.volume');

    case 'nutrition':
      return Nutrition.countDocuments({ user: userId, ...window });

    case 'calories':
      return sumField(Nutrition, { user, ...window }, 'totals.calories');

    case 'protein':
      return sumField(Nutrition, { user, ...window }, 'totals.protein');

    case 'weight': {
      const latest = await Progress.findOne({ user: userId }).sort({ date: -1 });
      return latest?.weight ?? null;
    }

    default:
      return null;
  }
}

export function isMet(goal, value) {
  if (value === null || value === undefined) return false;
  // `decrease` turns a goal into a ceiling (stay at or under target); the
  // default `increase` is a floor (reach at least target).
  return goal.direction === 'decrease' ? value <= goal.target : value >= goal.target;
}

// Progress toward a goal, for display. Capped at 100.
export function progressPercent(goal, value) {
  if (value === null || value === undefined || !goal.target) return 0;
  const ratio = goal.direction === 'decrease'
    // Under a ceiling = fully met; above it, decay toward 0.
    ? (value <= goal.target ? 1 : goal.target / value)
    : value / goal.target;
  return Math.max(0, Math.min(100, Math.round(ratio * 100)));
}

// Attaches live values to goals for the API response.
export async function decorateGoals(userId, goals) {
  return Promise.all(goals.map(async (goal) => {
    const value = await currentValue(userId, goal);
    const plain = typeof goal.toObject === 'function' ? goal.toObject() : goal;
    return {
      ...plain,
      current: value,
      progressPercent: progressPercent(goal, value),
      met: isMet(goal, value),
    };
  }));
}

// Re-evaluates a user's not-yet-achieved goals and marks/notifies any now met.
// `source` is the thing that was just written ('workout' | 'nutrition' |
// 'progress'), or a bare metric name for direct use.
export async function checkGoalsForUser(userId, source = null) {
  const query = { user: userId, achieved: false };
  if (source) {
    const metrics = METRICS_BY_SOURCE[source] || [source];
    query.metric = { $in: metrics };
  }

  const goals = await Goal.find(query);
  const achieved = [];

  for (const goal of goals) {
    const value = await currentValue(userId, goal);
    if (isMet(goal, value)) {
      goal.achieved = true;
      goal.achievedAt = new Date();
      await goal.save();
      await notify({
        user: userId,
        message: `Goal achieved: ${goal.title}!`,
        type: 'goal',
      });
      achieved.push(goal);
    }
  }

  return achieved;
}

export default { checkGoalsForUser, currentValue, decorateGoals, periodRange, progressPercent, isMet };
