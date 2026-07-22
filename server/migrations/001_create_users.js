import User from '../models/User.js';

// Creates the `users` collection and its unique indexes on `username` and `email`.
export const name = '001_create_users';

export async function up() {
  await User.createCollection();
  await User.createIndexes();
}

export async function down() {
  await User.collection.drop().catch((error) => {
    if (error.codeName !== 'NamespaceNotFound') throw error;
  });
}
