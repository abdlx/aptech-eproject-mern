// ============================================================================
// Original author: Munawwar (base Fitness Tracker backend).
// Modified by: Abdullah — added features on top (see AUTHORS.md for what changed).
// ============================================================================

import jwt from 'jsonwebtoken';

// Short-lived access token. Sessions are extended via refresh tokens, so this
// no longer needs a 30-day lifetime.
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_TTL || '1d'
  });
};

export default generateToken;