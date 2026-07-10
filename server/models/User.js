import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  profilePicture: {
    type: String,
    default: ''
  },
  preferences: {
    units: { type: String, default: 'metric' },
    theme: { type: String, default: 'light' },
    notificationsEnabled: { type: Boolean, default: true }
  }
}, { timestamps: true });

export default mongoose.model('User', userSchema);