import Nutrition from '../models/Nutrition.js';

// Creates the `nutritions` collection and its indexes.
export const name = '003_create_nutritions';

export async function up() {
  await Nutrition.createCollection();
  await Nutrition.createIndexes();
}

export async function down() {
  await Nutrition.collection.drop().catch((error) => {
    if (error.codeName !== 'NamespaceNotFound') throw error;
  });
}
