// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker backend by Munawwar).
// ============================================================================

// Volume and completion maths for workout sessions.
//
// A session's exercises carry both a *plan* (targetSets/targetReps/targetWeight,
// copied from the routine when the session starts) and *actuals* (`setLog`, one
// entry per set performed). Volume prefers actuals and falls back to the plan so
// that legacy workouts — logged before per-set tracking existed, with only the
// flat sets/reps/weight numbers — still produce a sensible figure.

function n(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

// Tonnage for a single exercise: sum of reps x weight over completed sets.
export function exerciseVolume(exercise = {}) {
  const log = Array.isArray(exercise.setLog) ? exercise.setLog : [];
  if (log.length) {
    return log
      .filter((set) => set.completed)
      .reduce((sum, set) => sum + n(set.reps) * n(set.weight), 0);
  }
  // Legacy / plan-only shape.
  return n(exercise.sets) * n(exercise.reps) * n(exercise.weight);
}

export function workoutVolume(workout = {}) {
  return (workout.exercises || []).reduce((sum, exercise) => sum + exerciseVolume(exercise), 0);
}

// Completed vs. planned sets across the whole session.
export function setCounts(workout = {}) {
  return (workout.exercises || []).reduce((acc, exercise) => {
    const log = Array.isArray(exercise.setLog) ? exercise.setLog : [];
    const planned = log.length || n(exercise.targetSets) || n(exercise.sets);
    const completed = log.length
      ? log.filter((set) => set.completed).length
      : n(exercise.sets);
    return { planned: acc.planned + planned, completed: acc.completed + completed };
  }, { planned: 0, completed: 0 });
}

// 0-100. Used for the session progress bar and to decide whether a finished
// session counts as fully done.
export function completionPercent(workout = {}) {
  const { planned, completed } = setCounts(workout);
  if (!planned) return 0;
  return Math.min(100, Math.round((completed / planned) * 100));
}

// Builds the empty actuals for an exercise when a routine is started, so the
// client gets a checkable set list rather than having to invent one.
export function buildSetLog(exercise = {}) {
  const count = Math.max(0, Math.round(n(exercise.targetSets) || n(exercise.sets)));
  return Array.from({ length: count }, (_, index) => ({
    setNumber: index + 1,
    reps: n(exercise.targetReps) || n(exercise.reps) || 0,
    weight: n(exercise.targetWeight) || n(exercise.weight) || 0,
    completed: false,
  }));
}

// Denormalised summary stored on the session so reports and goals do not have
// to re-walk every set.
export function summarise(workout = {}) {
  const { planned, completed } = setCounts(workout);
  return {
    volume: Math.round(workoutVolume(workout)),
    plannedSets: planned,
    completedSets: completed,
    completionPercent: completionPercent(workout),
    exerciseCount: (workout.exercises || []).length,
  };
}

export default { exerciseVolume, workoutVolume, setCounts, completionPercent, buildSetLog, summarise };
