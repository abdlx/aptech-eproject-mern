import Workout from '../models/Workout.js';
import Nutrition from '../models/Nutrition.js';
import Progress from '../models/Progress.js';
import PDFDocument from 'pdfkit';

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

// Get PDF Report
export const getPDFReport = async (req, res) => {
  try {
    const workouts = await Workout.find({ user: req.user._id });
    const nutrition = await Nutrition.find({ user: req.user._id });
    const progress = await Progress.find({ user: req.user._id });

    const doc = new PDFDocument({ margin: 48 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=fitness-report.pdf');

    doc.pipe(res);

    doc.fontSize(22).text('Fitness Tracker Report', { align: 'center' });
    doc.fontSize(10).fillColor('#666').text(`Generated ${new Date().toLocaleString()}`, { align: 'center' });
    doc.fillColor('#000');
    doc.moveDown();

    doc.fontSize(16).text('Workouts');
    workouts.forEach((w) => {
      const exercises = w.exercises.map((exercise) => `${exercise.name}: ${exercise.sets || 0}x${exercise.reps || 0} @ ${exercise.weight || 0}kg`).join('; ');
      doc.fontSize(11).text(`- ${w.name} (${w.category}) - ${new Date(w.date).toLocaleDateString()}${exercises ? ` | ${exercises}` : ''}`);
    });
    doc.moveDown();

    doc.fontSize(16).text('Nutrition Logs');
    nutrition.forEach((n) => {
      const calories = n.foods.reduce((sum, food) => sum + (food.calories || 0), 0);
      doc.fontSize(11).text(`- ${n.mealType} - ${calories} kcal - ${new Date(n.date).toLocaleDateString()}`);
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
    const workouts = await Workout.find({ user: req.user._id });
    const nutrition = await Nutrition.find({ user: req.user._id });
    const progress = await Progress.find({ user: req.user._id });
    const rows = [['type', 'name', 'date', 'details']];

    workouts.forEach((workout) => rows.push([
      'workout', workout.name, workout.date.toISOString(),
      `${workout.category}; ${workout.exercises.map((exercise) => exercise.name).join(', ')}`,
    ]));
    nutrition.forEach((meal) => rows.push([
      'nutrition', meal.mealType, meal.date.toISOString(),
      meal.foods.map((food) => `${food.name} ${food.quantity}${food.unit} ${food.calories || 0}kcal`).join('; '),
    ]));
    progress.forEach((entry) => rows.push([
      'progress', `${entry.weight || 0}kg`, entry.date.toISOString(), entry.notes || '',
    ]));

    const finalCSV = rows.map((row) => row.map(csvCell).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=fitness-report.csv');
    res.send(finalCSV);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
