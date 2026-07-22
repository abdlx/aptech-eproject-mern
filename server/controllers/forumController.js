// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker backend by Munawwar).
// ============================================================================

import ForumPost from '../models/ForumPost.js';
import Workout from '../models/Workout.js';
import { notify } from '../services/notificationService.js';
import { paginate, buildMeta } from '../utils/pagination.js';

// Shapes a post for the client, adding like count and (when a viewer is known)
// whether the viewer has liked it.
function shapePost(post, viewerId) {
  const obj = post.toObject ? post.toObject() : post;
  const likes = obj.likes || [];
  return {
    ...obj,
    likeCount: likes.length,
    likedByMe: viewerId ? likes.some((id) => id.toString() === viewerId.toString()) : false,
  };
}

export const getPosts = async (req, res, next) => {
  try {
    const { search, tag } = req.query;
    const { page, limit, skip } = paginate(req.query);
    const query = {};
    if (search) query.title = { $regex: search, $options: 'i' };
    if (tag) query.tags = tag;

    const [posts, total] = await Promise.all([
      ForumPost.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'username name profilePicture'),
      ForumPost.countDocuments(query),
    ]);

    // List view: include image, likes, and reply count but not full reply arrays.
    const items = posts.map((post) => {
      const shaped = shapePost(post, req.user?._id);
      return {
        _id: shaped._id,
        title: shaped.title,
        body: shaped.body,
        image: shaped.image,
        tags: shaped.tags,
        user: shaped.user,
        workoutSummary: shaped.workoutSummary,
        likeCount: shaped.likeCount,
        likedByMe: shaped.likedByMe,
        replyCount: (post.replies || []).length,
        createdAt: shaped.createdAt,
      };
    });

    res.json({ items, meta: buildMeta(total, page, limit) });
  } catch (error) {
    next(error);
  }
};

export const getPost = async (req, res, next) => {
  try {
    const post = await ForumPost.findById(req.params.id)
      .populate('user', 'username name profilePicture')
      .populate('replies.user', 'username name profilePicture');
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(shapePost(post, req.user?._id));
  } catch (error) {
    next(error);
  }
};

export const createPost = async (req, res, next) => {
  try {
    // Fields arrive as multipart form-data (alongside the optional image file).
    const { title, body } = req.body;
    if (!title || !body) {
      return res.status(400).json({ message: 'title and body are required' });
    }

    let tags = req.body.tags;
    if (typeof tags === 'string') {
      tags = tags.split(',').map((tag) => tag.trim()).filter(Boolean);
    }

    const doc = {
      user: req.user._id,
      title,
      body,
      tags: Array.isArray(tags) ? tags : [],
    };

    if (req.file) {
      doc.image = `/uploads/posts/${req.file.filename}`;
    }

    // Optionally attach one of the author's own workouts and denormalize a summary.
    if (req.body.workout) {
      const workout = await Workout.findOne({ _id: req.body.workout, user: req.user._id });
      if (workout) {
        doc.workout = workout._id;
        doc.workoutSummary = { name: workout.name, category: workout.category };
      }
    }

    const created = await ForumPost.create(doc);
    const populated = await created.populate('user', 'username name profilePicture');
    res.status(201).json(shapePost(populated, req.user._id));
  } catch (error) {
    next(error);
  }
};

export const deletePost = async (req, res, next) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    // Author or admin may delete.
    if (post.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await post.deleteOne();
    res.json({ message: 'Post removed' });
  } catch (error) {
    next(error);
  }
};

// Like or unlike a post (toggle). Notifies the author on a new like.
export const toggleLike = async (req, res, next) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const uid = req.user._id.toString();
    const already = post.likes.some((id) => id.toString() === uid);

    if (already) {
      post.likes = post.likes.filter((id) => id.toString() !== uid);
    } else {
      post.likes.push(req.user._id);
    }
    await post.save();

    if (!already && post.user.toString() !== uid) {
      await notify({
        user: post.user,
        message: `${req.user.name} liked your post "${post.title}".`,
        type: 'general',
      });
    }

    res.json({ likeCount: post.likes.length, likedByMe: !already });
  } catch (error) {
    next(error);
  }
};

export const addReply = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: 'message is required' });

    const post = await ForumPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.replies.push({ user: req.user._id, message });
    await post.save();

    // Notify the post author when someone else replies.
    if (post.user.toString() !== req.user._id.toString()) {
      await notify({
        user: post.user,
        message: `${req.user.name} replied to your post "${post.title}".`,
        type: 'general',
      });
    }

    const populated = await ForumPost.findById(post._id)
      .populate('user', 'username name profilePicture')
      .populate('replies.user', 'username name profilePicture');
    res.status(201).json(shapePost(populated, req.user._id));
  } catch (error) {
    next(error);
  }
};
