// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker backend by Munawwar).
// ============================================================================

import Goal from '../models/Goal.js';
import Workout from '../models/Workout.js';
import Nutrition from '../models/Nutrition.js';
import Progress from '../models/Progress.js';
import { notify } from './notificationService.js';

// Computes current value for a goal's metric.
async function currentValue(userId, goal) {
  if (goal.metric === 'workout') {
    return Workout.countDocuments({ user: userId });
  }
  if (goal.metric === 'nutrition') {
    return Nutrition.countDocuments({ user: userId });
  }
  if (goal.metric === 'weight') {
    const latest = await Progress.findOne({ user: userId }).sort({ date: -1 });
    return latest?.weight ?? null;
  }
  return null;
}

function isMet(goal, value) {
  if (value === null || value === undefined) return false;
  if (goal.metric === 'weight') {
    return goal.direction === 'decrease' ? value <= goal.target : value >= goal.target;
  }
  // Count-based metrics: reaching the target count.
  return value >= goal.target;
}

// Re-evaluates a user's not-yet-achieved goals for a metric and marks/notifies
// any that are now met. `metric` optionally narrows which goals to check.
export async function checkGoalsForUser(userId, metric = null) {
  const query = { user: userId, achieved: false };
  if (metric) query.metric = metric;

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

export default { checkGoalsForUser };
