// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker backend by Munawwar).
// ============================================================================

import mongoose from 'mongoose';

const replySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
  },
}, { timestamps: true });

const forumPostSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 160,
  },
  body: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000,
  },
  // Path to an uploaded workout photo, served from /uploads/posts.
  image: {
    type: String,
    default: '',
  },
  // Optional link to one of the author's logged workouts. Denormalized fields
  // let the feed render workout details without a second lookup.
  workout: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workout',
  },
  workoutSummary: {
    name: { type: String },
    category: { type: String },
  },
  // Users who liked this post. Length is the like count; membership is "did I like it".
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  tags: [String],
  replies: [replySchema],
}, { timestamps: true });

export default mongoose.model('ForumPost', forumPostSchema);
