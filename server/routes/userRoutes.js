// ============================================================================
// Original author: Munawwar (base Fitness Tracker backend).
// Modified by: Abdullah — added features on top (see AUTHORS.md for what changed).
// ============================================================================

import express from 'express';
import {
  getUserProfile,
  updateUserProfile,
  searchUsers,
  getDashboardAnalytics,
  getUserTargets
} from '../controllers/userController.js';
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing
} from '../controllers/followController.js';
import protect from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.get('/', protect, getUserProfile);
router.put('/', protect, updateUserProfile);
router.put('/profile-picture', protect, upload.single('profilePicture'), updateUserProfile);
router.get('/search', protect, searchUsers);
router.get('/dashboard', protect, getDashboardAnalytics);
router.get('/targets', protect, getUserTargets);

// Social graph
router.post('/:id/follow', protect, followUser);
router.delete('/:id/follow', protect, unfollowUser);
router.get('/:id/followers', protect, getFollowers);
router.get('/:id/following', protect, getFollowing);

export default router;