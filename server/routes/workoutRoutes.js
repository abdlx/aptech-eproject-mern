import express from 'express';
import {
  getWorkouts,
  createWorkout,
  updateWorkout,
  deleteWorkout
} from '../controllers/workoutController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getWorkouts);
router.post('/', protect, createWorkout);
router.put('/:id', protect, updateWorkout);
router.delete('/:id', protect, deleteWorkout);

export default router;
