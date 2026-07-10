import express from 'express';
import {
  getProgress,
  createProgress,
  updateProgress,
  deleteProgress
} from '../controllers/progressController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getProgress);
router.post('/', protect, createProgress);
router.put('/:id', protect, updateProgress);
router.delete('/:id', protect, deleteProgress);

export default router;