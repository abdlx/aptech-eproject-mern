import Reminder from '../models/Reminder.js';

export const getReminders = async (req, res, next) => {
  try {
    const reminders = await Reminder.find({ user: req.user._id }).sort({ time: 1 });
    res.json(reminders);
  } catch (error) {
    next(error);
  }
};

export const createReminder = async (req, res, next) => {
  try {
    const reminder = await Reminder.create({
      user: req.user._id,
      title: req.body.title,
      type: req.body.type,
      time: req.body.time,
    });
    res.status(201).json(reminder);
  } catch (error) {
    next(error);
  }
};

export const updateReminder = async (req, res, next) => {
  try {
    const reminder = await Reminder.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true },
    );
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });
    res.json(reminder);
  } catch (error) {
    next(error);
  }
};

export const deleteReminder = async (req, res, next) => {
  try {
    const reminder = await Reminder.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });
    res.json({ message: 'Reminder removed' });
  } catch (error) {
    next(error);
  }
};
