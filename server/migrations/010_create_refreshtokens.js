// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker backend by Munawwar).
// ============================================================================

import RefreshToken from '../models/RefreshToken.js';

// Creates the `refreshtokens` collection with its user/tokenHash indexes and the
// TTL index that auto-removes expired tokens.
export const name = '010_create_refreshtokens';

export async function up() {
  await RefreshToken.createCollection();
  await RefreshToken.createIndexes();
}

export async function down() {
  await RefreshToken.collection.drop().catch((error) => {
    if (error.codeName !== 'NamespaceNotFound') throw error;
  });
}
