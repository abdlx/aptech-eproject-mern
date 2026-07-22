// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker backend by Munawwar).
// ============================================================================

import mongoose from 'mongoose';

// Stores hashed refresh tokens so sessions can be revoked (logout) independent
// of the short-lived access token. Only the SHA-256 hash of the token is kept.
const refreshTokenSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  tokenHash: {
    type: String,
    required: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  revokedAt: {
    type: Date,
  },
}, { timestamps: true });

// TTL index: MongoDB removes documents shortly after they expire.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('RefreshToken', refreshTokenSchema);
