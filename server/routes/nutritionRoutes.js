import express from 'express';
import {
  getNutrition,
  createNutrition,
  updateNutrition,
  deleteNutrition
} from '../controllers/nutritionController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getNutrition);
router.post('/', protect, createNutrition);
router.put('/:id', protect, updateNutrition);
router.delete('/:id', protect, deleteNutrition);

export default router;