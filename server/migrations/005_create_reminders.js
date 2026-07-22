import Reminder from '../models/Reminder.js';

// Creates the `reminders` collection and its index on `user`.
export const name = '005_create_reminders';

export async function up() {
  await Reminder.createCollection();
  await Reminder.createIndexes();
}

export async function down() {
  await Reminder.collection.drop().catch((error) => {
    if (error.codeName !== 'NamespaceNotFound') throw error;
  });
}
