// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker backend by Munawwar).
// ============================================================================

import express from 'express';
import protect from '../middleware/authMiddleware.js';
import { getGoals, createGoal, updateGoal, deleteGoal } from '../controllers/goalController.js';

const router = express.Router();

router.use(protect);
router.route('/').get(getGoals).post(createGoal);
router.route('/:id').put(updateGoal).delete(deleteGoal);

export default router;
