// ============================================================================
// Original author: Munawwar (base Fitness Tracker backend).
// Modified by: Abdullah — added features on top (see AUTHORS.md for what changed).
// ============================================================================

import express from 'express';
import {
  registerUser,
  loginUser,
  refresh,
  logout,
  verifyEmail,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', authLimiter, registerUser);
router.post('/login', authLimiter, loginUser);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

export default router;
