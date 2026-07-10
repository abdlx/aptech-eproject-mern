import express from 'express';
import {
  getPDFReport,
  getCSVReport
} from '../controllers/reportController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/pdf', protect, getPDFReport);
router.get('/csv', protect, getCSVReport);

export default router;