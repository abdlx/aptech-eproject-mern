// ============================================================================
// Original author: Munawwar (base Fitness Tracker backend).
// Modified by: Abdullah — reports now read the stored totals/summary rather
// than recomputing calories with their own inline reduce.
// ============================================================================

import Workout from '../models/Workout.js';
import Nutrition from '../models/Nutrition.js';
import Progress from '../models/Progress.js';
import { sumEntries } from '../services/nutritionMath.js';
import { summarise } from '../services/workoutMath.js';
import PDFDocument from 'pdfkit';

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

// Falls back to recomputing for any record written before totals were stored.
function mealTotals(meal) {
  return meal.totals?.calories !== undefined ? meal.totals : sumEntries(meal.foods || []);
}

function workoutSummary(workout) {
  return workout.summary?.volume !== undefined ? workout.summary : summarise(workout);
}

function describeExercise(exercise) {
  const log = exercise.setLog || [];
  if (log.length) {
    const done = log.filter((set) => set.completed);
    // Per-set actuals, collapsed when every set matched.
    const uniform = done.length && done.every((set) => set.reps === done[0].reps && set.weight === done[0].weight);
    if (uniform) return `${exercise.name}: ${done.length}x${done[0].reps} @ ${done[0].weight}kg`;
    return `${exercise.name}: ${done.map((set) => `${set.reps}@${set.weight}kg`).join(', ')}`;
  }
  return `${exercise.name}: ${exercise.sets || 0}x${exercise.reps || 0} @ ${exercise.weight || 0}kg`;
}

// Get PDF Report
export const getPDFReport = async (req, res) => {
  try {
    const workouts = await Workout.find({ user: req.user._id }).sort({ date: -1 });
    const nutrition = await Nutrition.find({ user: req.user._id }).sort({ date: -1 });
    const progress = await Progress.find({ user: req.user._id }).sort({ date: -1 });

    const doc = new PDFDocument({ margin: 48 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=fitness-report.pdf');

    doc.pipe(res);

    doc.fontSize(22).text('Fitness Tracker Report', { align: 'center' });
    doc.fontSize(10).fillColor('#666').text(`Generated ${new Date().toLocaleString()}`, { align: 'center' });
    doc.fillColor('#000');
    doc.moveDown();

    // Headline figures, so the report opens with totals rather than a raw list.
    const totalVolume = workouts.reduce((sum, workout) => sum + (workoutSummary(workout).volume || 0), 0);
    const nutritionTotals = sumEntries(nutrition.map(mealTotals));
    doc.fontSize(16).text('Summary');
    doc.fontSize(11)
      .text(`Workouts: ${workouts.length}  |  Total volume: ${Math.round(totalVolume)} kg`)
      .text(`Meals logged: ${nutrition.length}  |  Total intake: ${Math.round(nutritionTotals.calories)} kcal`)
      .text(`Protein ${Math.round(nutritionTotals.protein)}g · Carbs ${Math.round(nutritionTotals.carbs)}g · Fats ${Math.round(nutritionTotals.fats)}g`);
    if (progress[0]?.weight) doc.text(`Latest weight: ${progress[0].weight} kg`);
    doc.moveDown();

    doc.fontSize(16).text('Workouts');
    workouts.forEach((w) => {
      const summary = workoutSummary(w);
      const exercises = w.exercises.map(describeExercise).join('; ');
      doc.fontSize(11).text(
        `- ${w.name} (${w.category}) - ${new Date(w.date).toLocaleDateString()}`
        + ` | ${summary.completedSets}/${summary.plannedSets} sets, ${summary.volume}kg`
        + `${exercises ? ` | ${exercises}` : ''}`,
      );
    });
    doc.moveDown();

    doc.fontSize(16).text('Nutrition Logs');
    nutrition.forEach((n) => {
      const totals = mealTotals(n);
      doc.fontSize(11).text(
        `- ${n.mealType} - ${Math.round(totals.calories)} kcal`
        + ` (P${Math.round(totals.protein)} C${Math.round(totals.carbs)} F${Math.round(totals.fats)})`
        + ` - ${new Date(n.date).toLocaleDateString()}`,
      );
    });
    doc.moveDown();

    doc.fontSize(16).text('Progress Logs');
    progress.forEach((p) => {
      doc.fontSize(11).text(`- Weight: ${p.weight || 0}kg - ${new Date(p.date).toLocaleDateString()}`);
    });

    doc.end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get CSV Report
export const getCSVReport = async (req, res) => {
  try {
    const workouts = await Workout.find({ user: req.user._id }).sort({ date: -1 });
    const nutrition = await Nutrition.find({ user: req.user._id }).sort({ date: -1 });
    const progress = await Progress.find({ user: req.user._id }).sort({ date: -1 });
    const rows = [['type', 'name', 'date', 'calories', 'protein', 'carbs', 'fats', 'volume', 'details']];

    workouts.forEach((workout) => {
      const summary = workoutSummary(workout);
      rows.push([
        'workout', workout.name, workout.date.toISOString(),
        '', '', '', '', summary.volume,
        `${workout.category}; ${workout.exercises.map(describeExercise).join(', ')}`,
      ]);
    });
    nutrition.forEach((meal) => {
      const totals = mealTotals(meal);
      rows.push([
        'nutrition', meal.mealType, meal.date.toISOString(),
        Math.round(totals.calories), Math.round(totals.protein), Math.round(totals.carbs), Math.round(totals.fats), '',
        meal.foods.map((food) => `${food.name} ${food.quantity}${food.unit} (${Math.round(food.calories || 0)}kcal)`).join('; '),
      ]);
    });
    progress.forEach((entry) => rows.push([
      'progress', `${entry.weight || 0}kg`, entry.date.toISOString(),
      '', '', '', '', '', entry.notes || '',
    ]));

    const finalCSV = rows.map((row) => row.map(csvCell).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=fitness-report.csv');
    res.send(finalCSV);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
