// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker backend by Munawwar).
// ============================================================================

import express from 'express';
import protect from '../middleware/authMiddleware.js';
import {
  getRoutines,
  getRoutine,
  createRoutine,
  updateRoutine,
  deleteRoutine,
  startRoutine,
} from '../controllers/routineController.js';

const router = express.Router();

router.use(protect);
router.route('/').get(getRoutines).post(createRoutine);
router.post('/:id/start', startRoutine);
router.route('/:id').get(getRoutine).put(updateRoutine).delete(deleteRoutine);

export default router;
