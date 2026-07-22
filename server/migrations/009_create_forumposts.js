// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker backend by Munawwar).
// ============================================================================

import ForumPost from '../models/ForumPost.js';

// Creates the `forumposts` collection and its index on `user`.
export const name = '009_create_forumposts';

export async function up() {
  await ForumPost.createCollection();
  await ForumPost.createIndexes();
}

export async function down() {
  await ForumPost.collection.drop().catch((error) => {
    if (error.codeName !== 'NamespaceNotFound') throw error;
  });
}
