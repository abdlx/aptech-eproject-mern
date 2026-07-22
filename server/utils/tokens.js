// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker backend by Munawwar).
// ============================================================================

import crypto from 'crypto';

// Generates a random token and its SHA-256 hash. The raw token is sent to the
// user (email or, in dev, the API response); only the hash is stored in the DB
// so a database leak can't be used to reset passwords or verify emails.
export function createHashedToken() {
  const raw = crypto.randomBytes(32).toString('hex');
  const hashed = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hashed };
}

export function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}
