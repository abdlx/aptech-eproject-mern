import Feedback from '../models/Feedback.js';

// Create Feedback
export const createFeedback = async (req, res) => {
  try {
    const { subject, message } = req.body;

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

// Get All Feedback
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