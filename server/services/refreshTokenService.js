// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker backend by Munawwar).
// ============================================================================

import RefreshToken from '../models/RefreshToken.js';
import { createHashedToken, hashToken } from '../utils/tokens.js';

const REFRESH_TTL_DAYS = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS, 10) || 30;

// Issues a new refresh token for a user, storing only its hash. Returns the raw
// token (given to the client once) and its expiry.
export async function issueRefreshToken(userId) {
  const { raw, hashed } = createHashedToken();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ user: userId, tokenHash: hashed, expiresAt });
  return { raw, expiresAt };
}

// Validates a raw refresh token: must exist, be unrevoked, and unexpired.
export async function findValidRefreshToken(raw) {
  if (!raw) return null;
  const tokenHash = hashToken(raw);
  const record = await RefreshToken.findOne({ tokenHash });
  if (!record) return null;
  if (record.revokedAt) return null;
  if (record.expiresAt.getTime() <= Date.now()) return null;
  return record;
}

// Rotates a refresh token: revokes the old one and issues a fresh one. This
// limits the blast radius if a refresh token leaks.
export async function rotateRefreshToken(record) {
  record.revokedAt = new Date();
  await record.save();
  return issueRefreshToken(record.user);
}

// Revokes a single refresh token (logout of one session).
export async function revokeRefreshToken(raw) {
  const tokenHash = hashToken(raw);
  await RefreshToken.updateOne(
    { tokenHash, revokedAt: null },
    { revokedAt: new Date() },
  );
}

// Revokes every active session for a user (logout everywhere / password change).
export async function revokeAllForUser(userId) {
  await RefreshToken.updateMany(
    { user: userId, revokedAt: null },
    { revokedAt: new Date() },
  );
}

export default {
  issueRefreshToken,
  findValidRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
};
