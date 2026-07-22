// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker backend by Munawwar).
// ============================================================================

import mongoose from 'mongoose';
import User from '../models/User.js';
import { notify } from '../services/notificationService.js';

export const followUser = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    if (!mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }
    if (targetId === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    const target = await User.findById(targetId);
    if (!target) return res.status(404).json({ message: 'User not found' });

    const alreadyFollowing = target.followers.some((id) => id.toString() === req.user._id.toString());
    if (alreadyFollowing) {
      return res.status(409).json({ message: 'Already following this user' });
    }

    await User.findByIdAndUpdate(targetId, { $addToSet: { followers: req.user._id } });
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { following: targetId } });

    await notify({
      user: targetId,
      message: `${req.user.name} started following you.`,
      type: 'general',
    });

    res.json({ message: `You are now following ${target.name}` });
  } catch (error) {
    next(error);
  }
};

export const unfollowUser = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    if (!mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }
    const target = await User.findById(targetId);
    if (!target) return res.status(404).json({ message: 'User not found' });

    await User.findByIdAndUpdate(targetId, { $pull: { followers: req.user._id } });
    await User.findByIdAndUpdate(req.user._id, { $pull: { following: targetId } });

    res.json({ message: `You have unfollowed ${target.name}` });
  } catch (error) {
    next(error);
  }
};

export const getFollowers = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('followers', 'username name profilePicture');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.followers);
  } catch (error) {
    next(error);
  }
};

export const getFollowing = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('following', 'username name profilePicture');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.following);
  } catch (error) {
    next(error);
  }
};
