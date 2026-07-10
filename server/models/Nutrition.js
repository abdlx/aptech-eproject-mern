import mongoose from 'mongoose';

const nutritionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mealType: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'snack'],
    required: true
  },
  foods: [
    {
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      unit: { type: String, default: 'g' },
      calories: { type: Number },
      protein: { type: Number },
      carbs: { type: Number },
      fats: { type: Number }
    }
  ],
  date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

export default mongoose.model('Nutrition', nutritionSchema);