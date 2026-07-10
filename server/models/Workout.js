import mongoose from 'mongoose';

const workoutSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['strength', 'cardio', 'flexibility', 'other'],
    default: 'other'
  },
  exercises: [
    {
      name: { type: String, required: true },
      sets: { type: Number },
      reps: { type: Number },
      weight: { type: Number },
      notes: { type: String }
    }
  ],
  tags: [String],
  date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

export default mongoose.model('Workout', workoutSchema);