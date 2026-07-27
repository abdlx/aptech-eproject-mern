// ============================================================================
// Original author: Munawwar (base Fitness Tracker backend).
// Modified by: Abdullah — added the daily summary route.
// ============================================================================

import express from 'express';
import {
  getNutrition,
  getDailySummary,
  createNutrition,
  updateNutrition,
  deleteNutrition
} from '../controllers/nutritionController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getNutrition);
// Declared before '/:id' so "summary" is not read as an id.
router.get('/summary', protect, getDailySummary);
router.post('/', protect, createNutrition);
router.put('/:id', protect, updateNutrition);
router.delete('/:id', protect, deleteNutrition);

export default router;
