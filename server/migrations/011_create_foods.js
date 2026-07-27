import Food from '../models/Food.js';

// Creates the `foods` reference table and its search indexes.
export const name = '011_create_foods';

export async function up() {
  await Food.createCollection();
  await Food.createIndexes();
}

export async function down() {
  await Food.collection.drop().catch((error) => {
    if (error.codeName !== 'NamespaceNotFound') throw error;
  });
}
