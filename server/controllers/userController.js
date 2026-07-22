// ============================================================================
// Original author: Munawwar (base Fitness Tracker backend).
// Modified by: Abdullah — added features on top (see AUTHORS.md for what changed).
// ============================================================================

import User from '../models/User.js';
import bcrypt from 'bcryptjs';

// Get User Profile
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update User Profile
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      if (req.body.name) user.name = req.body.name.trim();
      if (req.body.email) user.email = req.body.email.trim().toLowerCase();
      if (req.body.username) user.username = req.body.username.trim().toLowerCase();
      if (req.body.preferences) {
        user.preferences = {
          ...user.preferences.toObject(),
          ...req.body.preferences,
        };
      }

      if (req.body.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);
      }

      if (req.file) {
        user.profilePicture = `/uploads/profilePictures/${req.file.filename}`;
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        username: updatedUser.username,
        name: updatedUser.name,
        email: updatedUser.email,
        profilePicture: updatedUser.profilePicture,
        preferences: updatedUser.preferences
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'That email or username is already in use' });
    }
    res.status(400).json({ message: error.message });
  }
};

// Search Users
export const searchUsers = async (req, res) => {
  try {
    const search = req.query.search?.trim();
    if (!search) return res.json([]);
    const users = await User.find({
      $or: [
        { username: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ]
    }).select('username name profilePicture').limit(20);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Dashboard Analytics
export const getDashboardAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;

    const workoutCount = await (await import('../models/Workout.js')).default.countDocuments({ user: userId });
    const nutritionCount = await (await import('../models/Nutrition.js')).default.countDocuments({ user: userId });
    const progressCount = await (await import('../models/Progress.js')).default.countDocuments({ user: userId });

    const recentWorkouts = await (await import('../models/Workout.js')).default.find({ user: userId }).sort({ date: -1 }).limit(3);
    const recentNutrition = await (await import('../models/Nutrition.js')).default.find({ user: userId }).sort({ date: -1 }).limit(3);
    const recentProgress = await (await import('../models/Progress.js')).default.find({ user: userId }).sort({ date: -1 }).limit(1);

    res.json({
      stats: {
        totalWorkouts: workoutCount,
        totalNutritionLogs: nutritionCount,
        totalProgressLogs: progressCount
      },
      recentWorkouts,
      recentNutrition,
      recentProgress
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
