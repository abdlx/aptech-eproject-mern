// ============================================================================
// Original author: Munawwar (base Fitness Tracker backend).
// Modified by: Abdullah — added features on top (see AUTHORS.md for what changed).
// ============================================================================

import Feedback from '../models/Feedback.js';
import { notify } from '../services/notificationService.js';
import { paginate, buildMeta } from '../utils/pagination.js';

// Create Feedback
export const createFeedback = async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ message: 'subject and message are required' });
    }

    const feedback = await Feedback.create({
      user: req.user._id,
      subject,
      message
    });

    res.status(201).json(feedback);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get the current user's feedback
export const getFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.find({
      user: req.user._id
    }).sort({ createdAt: -1 });
    res.json(feedback);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: list all feedback (paginated, optionally filtered by status)
export const getAllFeedback = async (req, res) => {
  try {
    const { status } = req.query;
    const { page, limit, skip } = paginate(req.query);
    const query = {};
    if (status) query.status = status;

    const [items, total] = await Promise.all([
      Feedback.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'username name email'),
      Feedback.countDocuments(query),
    ]);

    res.json({ items, meta: buildMeta(total, page, limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: reply to a piece of feedback and notify its author
export const replyToFeedback = async (req, res) => {
  try {
    const { reply, status } = req.body;
    if (!reply) return res.status(400).json({ message: 'reply is required' });

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ message: 'Feedback not found' });

    feedback.adminReply = reply;
    feedback.repliedBy = req.user._id;
    feedback.repliedAt = new Date();
    feedback.status = status && ['pending', 'reviewed', 'resolved'].includes(status)
      ? status
      : 'reviewed';
    await feedback.save();

    await notify({
      user: feedback.user,
      message: `Support replied to your feedback: "${feedback.subject}".`,
      type: 'general',
    });

    res.json(feedback);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
