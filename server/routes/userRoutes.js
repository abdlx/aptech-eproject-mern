import express from 'express';
import { getUserProfile, updateUserProfile } from '../controllers/userController.js';
import protect from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.get('/', protect, getUserProfile);
router.put('/', protect, updateUserProfile);
router.put('/profile-picture', protect, upload.single('profilePicture'), updateUserProfile);

export default router;