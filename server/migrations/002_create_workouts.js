import Workout from '../models/Workout.js';

// Creates the `workouts` collection and its indexes.
export const name = '002_create_workouts';

export async function up() {
  await Workout.createCollection();
  await Workout.createIndexes();
}

export async function down() {
  await Workout.collection.drop().catch((error) => {
    if (error.codeName !== 'NamespaceNotFound') throw error;
  });
}
