import Progress from '../models/Progress.js';

// Get All Progress
export const getProgress = async (req, res) => {
  try {
    const progress = await Progress.find({ user: req.user._id }).sort({ date: -1 });
    res.json(progress);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create Progress
export const createProgress = async (req, res) => {
  try {
    const { weight, bodyMeasurements, performanceMetrics, notes } = req.body;

    const progress = await Progress.create({
      user: req.user._id,
      weight,
      bodyMeasurements,
      performanceMetrics,
      notes
    });

    res.status(201).json(progress);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Progress
export const updateProgress = async (req, res) => {
  try {
    const progress = await Progress.findById(req.params.id);

    if (!progress) {
      return res.status(404).json({ message: 'Progress not found' });
    }

    if (progress.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const updatedProgress = await Progress.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updatedProgress);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Progress
export const deleteProgress = async (req, res) => {
  try {
    const progress = await Progress.findById(req.params.id);

    if (!progress) {
      return res.status(404).json({ message: 'Progress not found' });
    }

    if (progress.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await progress.deleteOne();
    res.json({ message: 'Progress removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};