import Workout from '../models/Workout.js';
import Nutrition from '../models/Nutrition.js';
import Progress from '../models/Progress.js';

// Get PDF Report
export const getPDFReport = async (req, res) => {
  try {
    const workouts = await Workout.find({ user: req.user._id });
    const nutrition = await Nutrition.find({ user: req.user._id });
    const progress = await Progress.find({ user: req.user._id });

    const reportData = {
      workouts,
      nutrition,
      progress
    };

    res.json({ message: 'PDF Report Data', data: reportData });
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

    const reportData = {
      workouts,
      nutrition,
      progress
    };

    res.json({ message: 'CSV Report Data', data: reportData });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};