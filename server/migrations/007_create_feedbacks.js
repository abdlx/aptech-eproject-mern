import Feedback from '../models/Feedback.js';

// Creates the `feedbacks` collection and its indexes.
export const name = '007_create_feedbacks';

export async function up() {
  await Feedback.createCollection();
  await Feedback.createIndexes();
}

export async function down() {
  await Feedback.collection.drop().catch((error) => {
    if (error.codeName !== 'NamespaceNotFound') throw error;
  });
}
