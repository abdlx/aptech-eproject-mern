import Food from '../models/Food.js';
import SEED_FOODS from '../data/seedFoods.js';

// Loads the starter food table so the meal picker is usable on a fresh install.
// Idempotent: upserts on (name, brand, owner) so re-running will not duplicate.
export const name = '012_seed_foods';

export async function up() {
  const operations = SEED_FOODS.map((food) => ({
    updateOne: {
      filter: { name: food.name, brand: food.brand || '', owner: null },
      update: {
        $set: {
          ...food,
          brand: food.brand || '',
          basisUnit: food.basisUnit || 'g',
          owner: null,
          verified: true,
        },
      },
      upsert: true,
    },
  }));

  const result = await Food.bulkWrite(operations);
  console.log(`  seeded ${result.upsertedCount} food(s), matched ${result.matchedCount}`);
}

export async function down() {
  // Only removes the shipped globals; user-created foods are left alone.
  await Food.deleteMany({ owner: null, verified: true });
}
