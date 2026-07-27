import Routine from '../models/Routine.js';

// Creates the `routines` collection (reusable workout templates).
export const name = '013_create_routines';

export async function up() {
  await Routine.createCollection();
  await Routine.createIndexes();
}

export async function down() {
  await Routine.collection.drop().catch((error) => {
    if (error.codeName !== 'NamespaceNotFound') throw error;
  });
}
