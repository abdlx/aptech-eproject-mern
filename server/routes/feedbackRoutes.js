// ============================================================================
// Original author: Munawwar (base Fitness Tracker backend).
// Modified by: Abdullah — added features on top (see AUTHORS.md for what changed).
// ============================================================================

import express from 'express';
import {
  createFeedback,
  getFeedback,
  getAllFeedback,
  replyToFeedback
} from '../controllers/feedbackController.js';
import protect from '../middleware/authMiddleware.js';
import admin from '../middleware/adminMiddleware.js';

const router = express.Router();

router.post('/', protect, createFeedback);
router.get('/', protect, getFeedback);

// Admin-only
router.get('/all', protect, admin, getAllFeedback);
router.put('/:id/reply', protect, admin, replyToFeedback);

export default router;
