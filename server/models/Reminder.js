import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema({
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
    maxlength: 120,
  },
  type: {
    type: String,
    enum: ['workout', 'nutrition', 'goal'],
    default: 'workout',
  },
  time: {
    type: Date,
    required: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

export default mongoose.model('Reminder', reminderSchema);
