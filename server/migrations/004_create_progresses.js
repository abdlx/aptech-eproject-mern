import Progress from '../models/Progress.js';

// Creates the `progresses` collection and its indexes.
export const name = '004_create_progresses';

export async function up() {
  await Progress.createCollection();
  await Progress.createIndexes();
}

export async function down() {
  await Progress.collection.drop().catch((error) => {
    if (error.codeName !== 'NamespaceNotFound') throw error;
  });
}
