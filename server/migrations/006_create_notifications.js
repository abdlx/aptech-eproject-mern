import Notification from '../models/Notification.js';

// Creates the `notifications` collection and its indexes.
export const name = '006_create_notifications';

export async function up() {
  await Notification.createCollection();
  await Notification.createIndexes();
}

export async function down() {
  await Notification.collection.drop().catch((error) => {
    if (error.codeName !== 'NamespaceNotFound') throw error;
  });
}
