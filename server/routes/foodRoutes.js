// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker backend by Munawwar).
// ============================================================================

import express from 'express';
import protect from '../middleware/authMiddleware.js';
import {
  searchFoods,
  getFood,
  createFood,
  updateFood,
  deleteFood,
  previewPortion,
} from '../controllers/foodController.js';

const router = express.Router();

router.use(protect);
router.post('/preview', previewPortion);
router.route('/').get(searchFoods).post(createFood);
router.route('/:id').get(getFood).put(updateFood).delete(deleteFood);

export default router;
