import Nutrition from '../models/Nutrition.js';

// Get All Nutrition Logs
export const getNutrition = async (req, res) => {
  try {
    const { mealType, search } = req.query;
    let query = { user: req.user._id };

    if (mealType) query.mealType = mealType;
    if (search) query['foods.name'] = { $regex: search, $options: 'i' };

    const nutrition = await Nutrition.find(query).sort({ date: -1 });
    res.json(nutrition);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create Nutrition Log
export const createNutrition = async (req, res) => {
  try {
    const { mealType, foods } = req.body;

    const nutrition = await Nutrition.create({
      user: req.user._id,
      mealType,
      foods
    });

    res.status(201).json(nutrition);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Nutrition Log
export const updateNutrition = async (req, res) => {
  try {
    const nutrition = await Nutrition.findById(req.params.id);

    if (!nutrition) {
      return res.status(404).json({ message: 'Nutrition log not found' });
    }

    if (nutrition.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const updatedNutrition = await Nutrition.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updatedNutrition);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Nutrition Log
export const deleteNutrition = async (req, res) => {
  try {
    const nutrition = await Nutrition.findById(req.params.id);

    if (!nutrition) {
      return res.status(404).json({ message: 'Nutrition log not found' });
    }

    if (nutrition.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await nutrition.deleteOne();
    res.json({ message: 'Nutrition log removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};