// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker backend by Munawwar).
// ============================================================================

import Goal from '../models/Goal.js';

// Creates the `goals` collection and its index on `user`.
export const name = '008_create_goals';

export async function up() {
  await Goal.createCollection();
  await Goal.createIndexes();
}

export async function down() {
  await Goal.collection.drop().catch((error) => {
    if (error.codeName !== 'NamespaceNotFound') throw error;
  });
}
