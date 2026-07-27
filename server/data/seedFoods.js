// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker backend by Munawwar).
// ============================================================================

// Starter food table so the picker is useful on a fresh install. Values are per
// 100 g (or 100 ml for drinks), rounded from public composition data. These ship
// as global foods (owner: null); users can add their own on top.

const SEED_FOODS = [
  // Protein
  { name: 'Chicken breast, skinless, raw', category: 'protein', per100: { calories: 120, protein: 22.5, carbs: 0, fats: 2.6 }, gramsPerServing: 150, servingLabel: 'breast' },
  { name: 'Chicken thigh, skinless, raw', category: 'protein', per100: { calories: 145, protein: 19.7, carbs: 0, fats: 7.1 }, gramsPerServing: 90, servingLabel: 'thigh' },
  { name: 'Beef mince, 10% fat, raw', category: 'protein', per100: { calories: 176, protein: 20.1, carbs: 0, fats: 10.4 } },
  { name: 'Salmon fillet, raw', category: 'protein', per100: { calories: 208, protein: 20.4, carbs: 0, fats: 13.4 }, gramsPerServing: 130, servingLabel: 'fillet' },
  { name: 'Tuna, canned in water, drained', category: 'protein', per100: { calories: 116, protein: 25.5, carbs: 0, fats: 0.8 }, gramsPerServing: 95, servingLabel: 'tin' },
  { name: 'Egg, whole', category: 'protein', per100: { calories: 143, protein: 12.6, carbs: 0.7, fats: 9.5 }, gramsPerServing: 50, servingLabel: 'medium egg' },
  { name: 'Egg white', category: 'protein', per100: { calories: 52, protein: 10.9, carbs: 0.7, fats: 0.2 }, gramsPerServing: 33, servingLabel: 'white' },
  { name: 'Tofu, firm', category: 'protein', per100: { calories: 144, protein: 15.8, carbs: 4.3, fats: 8.7 } },
  { name: 'Whey protein powder', category: 'protein', per100: { calories: 400, protein: 80, carbs: 8, fats: 6 }, gramsPerServing: 30, servingLabel: 'scoop' },
  { name: 'Prawns, cooked', category: 'protein', per100: { calories: 99, protein: 24, carbs: 0.2, fats: 0.3 } },

  // Carbs
  { name: 'Rice, white, raw', category: 'carb', per100: { calories: 365, protein: 7.1, carbs: 80, fats: 0.7 } },
  { name: 'Rice, white, cooked', category: 'carb', per100: { calories: 130, protein: 2.7, carbs: 28.2, fats: 0.3 } },
  { name: 'Rice, brown, cooked', category: 'carb', per100: { calories: 123, protein: 2.7, carbs: 25.6, fats: 1 } },
  { name: 'Pasta, dry', category: 'carb', per100: { calories: 371, protein: 13, carbs: 74.7, fats: 1.5 } },
  { name: 'Pasta, cooked', category: 'carb', per100: { calories: 131, protein: 5, carbs: 25, fats: 1.1 } },
  { name: 'Oats, rolled', category: 'carb', per100: { calories: 379, protein: 13.2, carbs: 67.7, fats: 6.5 }, gramsPerServing: 40, servingLabel: 'serving' },
  { name: 'Bread, wholemeal', category: 'carb', per100: { calories: 247, protein: 13, carbs: 41, fats: 3.4 }, gramsPerServing: 38, servingLabel: 'slice' },
  { name: 'Bread, white', category: 'carb', per100: { calories: 265, protein: 9, carbs: 49, fats: 3.2 }, gramsPerServing: 36, servingLabel: 'slice' },
  { name: 'Potato, raw', category: 'carb', per100: { calories: 77, protein: 2, carbs: 17.5, fats: 0.1 } },
  { name: 'Sweet potato, raw', category: 'carb', per100: { calories: 86, protein: 1.6, carbs: 20.1, fats: 0.1 } },
  { name: 'Chapati / roti', category: 'carb', per100: { calories: 297, protein: 8.5, carbs: 46, fats: 8.5 }, gramsPerServing: 45, servingLabel: 'chapati' },
  { name: 'Quinoa, cooked', category: 'carb', per100: { calories: 120, protein: 4.4, carbs: 21.3, fats: 1.9 } },

  // Legumes
  { name: 'Lentils, cooked', category: 'protein', per100: { calories: 116, protein: 9, carbs: 20.1, fats: 0.4 } },
  { name: 'Chickpeas, cooked', category: 'protein', per100: { calories: 164, protein: 8.9, carbs: 27.4, fats: 2.6 } },
  { name: 'Black beans, cooked', category: 'protein', per100: { calories: 132, protein: 8.9, carbs: 23.7, fats: 0.5 } },

  // Dairy
  { name: 'Milk, whole', category: 'dairy', basisUnit: 'ml', per100: { calories: 61, protein: 3.2, carbs: 4.8, fats: 3.3 }, gramsPerServing: 250, servingLabel: 'glass' },
  { name: 'Milk, skimmed', category: 'dairy', basisUnit: 'ml', per100: { calories: 34, protein: 3.4, carbs: 5, fats: 0.1 }, gramsPerServing: 250, servingLabel: 'glass' },
  { name: 'Greek yoghurt, 0% fat', category: 'dairy', per100: { calories: 59, protein: 10.2, carbs: 3.6, fats: 0.4 }, gramsPerServing: 170, servingLabel: 'pot' },
  { name: 'Cheddar cheese', category: 'dairy', per100: { calories: 402, protein: 25, carbs: 1.3, fats: 33.1 }, gramsPerServing: 30, servingLabel: 'slice' },
  { name: 'Cottage cheese', category: 'dairy', per100: { calories: 98, protein: 11.1, carbs: 3.4, fats: 4.3 } },

  // Vegetables
  { name: 'Broccoli, raw', category: 'vegetable', per100: { calories: 34, protein: 2.8, carbs: 6.6, fats: 0.4 } },
  { name: 'Spinach, raw', category: 'vegetable', per100: { calories: 23, protein: 2.9, carbs: 3.6, fats: 0.4 } },
  { name: 'Carrot, raw', category: 'vegetable', per100: { calories: 41, protein: 0.9, carbs: 9.6, fats: 0.2 } },
  { name: 'Tomato, raw', category: 'vegetable', per100: { calories: 18, protein: 0.9, carbs: 3.9, fats: 0.2 } },
  { name: 'Cucumber, raw', category: 'vegetable', per100: { calories: 15, protein: 0.7, carbs: 3.6, fats: 0.1 } },
  { name: 'Onion, raw', category: 'vegetable', per100: { calories: 40, protein: 1.1, carbs: 9.3, fats: 0.1 } },
  { name: 'Bell pepper, raw', category: 'vegetable', per100: { calories: 31, protein: 1, carbs: 6, fats: 0.3 } },

  // Fruit
  { name: 'Banana', category: 'fruit', per100: { calories: 89, protein: 1.1, carbs: 22.8, fats: 0.3 }, gramsPerServing: 118, servingLabel: 'medium banana' },
  { name: 'Apple', category: 'fruit', per100: { calories: 52, protein: 0.3, carbs: 13.8, fats: 0.2 }, gramsPerServing: 182, servingLabel: 'medium apple' },
  { name: 'Orange', category: 'fruit', per100: { calories: 47, protein: 0.9, carbs: 11.8, fats: 0.1 }, gramsPerServing: 131, servingLabel: 'medium orange' },
  { name: 'Blueberries', category: 'fruit', per100: { calories: 57, protein: 0.7, carbs: 14.5, fats: 0.3 } },
  { name: 'Strawberries', category: 'fruit', per100: { calories: 32, protein: 0.7, carbs: 7.7, fats: 0.3 } },
  { name: 'Mango', category: 'fruit', per100: { calories: 60, protein: 0.8, carbs: 15, fats: 0.4 } },
  { name: 'Dates, dried', category: 'fruit', per100: { calories: 282, protein: 2.5, carbs: 75, fats: 0.4 }, gramsPerServing: 8, servingLabel: 'date' },

  // Fats
  { name: 'Olive oil', category: 'fat', basisUnit: 'ml', per100: { calories: 884, protein: 0, carbs: 0, fats: 100 }, gramsPerServing: 14, servingLabel: 'tbsp' },
  { name: 'Butter', category: 'fat', per100: { calories: 717, protein: 0.9, carbs: 0.1, fats: 81.1 }, gramsPerServing: 10, servingLabel: 'pat' },
  { name: 'Peanut butter', category: 'fat', per100: { calories: 588, protein: 25.1, carbs: 20, fats: 50.4 }, gramsPerServing: 32, servingLabel: 'tbsp' },
  { name: 'Almonds', category: 'fat', per100: { calories: 579, protein: 21.2, carbs: 21.6, fats: 49.9 }, gramsPerServing: 28, servingLabel: 'handful' },
  { name: 'Avocado', category: 'fat', per100: { calories: 160, protein: 2, carbs: 8.5, fats: 14.7 }, gramsPerServing: 150, servingLabel: 'medium avocado' },

  // Drinks
  { name: 'Orange juice', category: 'drink', basisUnit: 'ml', per100: { calories: 45, protein: 0.7, carbs: 10.4, fats: 0.2 }, gramsPerServing: 250, servingLabel: 'glass' },
  { name: 'Cola', category: 'drink', basisUnit: 'ml', per100: { calories: 42, protein: 0, carbs: 10.6, fats: 0 }, gramsPerServing: 330, servingLabel: 'can' },
  { name: 'Black coffee', category: 'drink', basisUnit: 'ml', per100: { calories: 1, protein: 0.1, carbs: 0, fats: 0 }, gramsPerServing: 240, servingLabel: 'cup' },
  { name: 'Tea, no milk', category: 'drink', basisUnit: 'ml', per100: { calories: 1, protein: 0, carbs: 0.2, fats: 0 }, gramsPerServing: 240, servingLabel: 'cup' },

  // Snacks / prepared
  { name: 'Dark chocolate, 70%', category: 'snack', per100: { calories: 598, protein: 7.8, carbs: 45.9, fats: 42.6 }, gramsPerServing: 25, servingLabel: 'bar' },
  { name: 'Potato crisps', category: 'snack', per100: { calories: 536, protein: 7, carbs: 53, fats: 34.6 }, gramsPerServing: 30, servingLabel: 'bag' },
  { name: 'Protein bar', category: 'snack', per100: { calories: 350, protein: 32, carbs: 35, fats: 9 }, gramsPerServing: 60, servingLabel: 'bar' },
  { name: 'Pizza, cheese', category: 'meal', per100: { calories: 266, protein: 11, carbs: 33, fats: 10 }, gramsPerServing: 107, servingLabel: 'slice' },
  { name: 'Biryani, chicken', category: 'meal', per100: { calories: 165, protein: 8.5, carbs: 20, fats: 5.5 }, gramsPerServing: 300, servingLabel: 'plate' },
];

export default SEED_FOODS;
