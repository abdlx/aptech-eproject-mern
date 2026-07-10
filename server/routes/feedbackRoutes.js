import express from 'express';
import {
  createFeedback,
  getFeedback
} from '../controllers/feedbackController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, createFeedback);
router.get('/', protect, getFeedback);

export default router;