// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker backend by Munawwar).
// ============================================================================

import express from 'express';
import protect from '../middleware/authMiddleware.js';
import { postUpload } from '../middleware/uploadMiddleware.js';
import {
  getPosts,
  getPost,
  createPost,
  deletePost,
  toggleLike,
  addReply,
} from '../controllers/forumController.js';

const router = express.Router();

router.use(protect);
router.route('/')
  .get(getPosts)
  .post(postUpload.single('image'), createPost);
router.route('/:id').get(getPost).delete(deletePost);
router.post('/:id/like', toggleLike);
router.post('/:id/replies', addReply);

export default router;
