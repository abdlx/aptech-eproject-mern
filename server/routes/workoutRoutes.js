// ============================================================================
// Original author: Munawwar (base Fitness Tracker backend).
// Modified by: Abdullah — added the live-session routes (active, sets, complete).
// ============================================================================

import express from 'express';
import {
  getWorkouts,
  getActiveWorkout,
  createWorkout,
  updateWorkout,
  deleteWorkout,
  logSet,
  addSet,
  completeWorkout
} from '../controllers/workoutController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getWorkouts);
router.post('/', protect, createWorkout);
// Must be declared before '/:id' so "active" is not read as an id.
router.get('/active', protect, getActiveWorkout);
router.post('/:id/complete', protect, completeWorkout);
router.post('/:id/exercises/:exerciseId/sets', protect, addSet);
router.put('/:id/exercises/:exerciseId/sets/:setId', protect, logSet);
router.put('/:id', protect, updateWorkout);
router.delete('/:id', protect, deleteWorkout);

export default router;
