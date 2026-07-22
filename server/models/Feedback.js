// ============================================================================
// Original author: Munawwar (base Fitness Tracker backend).
// Modified by: Abdullah — added features on top (see AUTHORS.md for what changed).
// ============================================================================

import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved'],
    default: 'pending'
  },
  adminReply: {
    type: String,
    default: ''
  },
  repliedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  repliedAt: {
    type: Date
  }
}, { timestamps: true });

export default mongoose.model('Feedback', feedbackSchema);