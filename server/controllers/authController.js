// ============================================================================
// Original author: Munawwar (base Fitness Tracker backend).
// Modified by: Abdullah — added features on top (see AUTHORS.md for what changed).
// ============================================================================

import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import generateToken from '../utils/generateToken.js';
import { createHashedToken, hashToken } from '../utils/tokens.js';
import {
  issueRefreshToken,
  findValidRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
} from '../services/refreshTokenService.js';

const EMAIL_TOKEN_TTL = 24 * 60 * 60 * 1000; // 24h
const RESET_TOKEN_TTL = 60 * 60 * 1000; // 1h

// In dev (EXPOSE_TOKENS !== 'false') we return verification/reset tokens in the
// response so the flow is testable without email. Set EXPOSE_TOKENS=false in prod.
const exposeTokens = process.env.EXPOSE_TOKENS !== 'false';

function publicUser(user) {
  return {
    _id: user._id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    profilePicture: user.profilePicture,
    preferences: user.preferences,
  };
}

async function authResponse(res, user, status = 200, extra = {}) {
  const { raw: refreshToken } = await issueRefreshToken(user._id);
  res.status(status).json({
    ...publicUser(user),
    token: generateToken(user._id),
    refreshToken,
    ...extra,
  });
}

// Register
export const registerUser = async (req, res) => {
  try {
    const username = req.body.username?.trim().toLowerCase();
    const name = req.body.name?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const { password } = req.body;

    if (!username || !name || !email || !password) {
      return res.status(400).json({ message: 'Username, name, email, and password are required' });
    }
    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
      return res.status(400).json({ message: 'Username must be 3-30 characters using letters, numbers, or underscores' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(409).json({
        message: userExists.email === email ? 'An account with this email already exists' : 'Username already taken',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const { raw: verifyRaw, hashed: verifyHashed } = createHashedToken();

    const user = await User.create({
      username,
      name,
      email,
      password: hashedPassword,
      emailVerificationToken: verifyHashed,
      emailVerificationExpires: new Date(Date.now() + EMAIL_TOKEN_TTL),
    });

    // In production this token would be emailed as a verification link.
    await authResponse(res, user, 201, exposeTokens ? { verificationToken: verifyRaw } : {});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login
export const loginUser = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      await authResponse(res, user, 200);
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Exchange a valid refresh token for a new access token (rotating the refresh token).
export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const record = await findValidRefreshToken(refreshToken);
    if (!record) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }
    const { raw: newRefresh } = await rotateRefreshToken(record);
    res.json({
      token: generateToken(record.user),
      refreshToken: newRefresh,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Logout: revoke the presented refresh token (this session only).
export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await revokeRefreshToken(refreshToken);
    res.json({ message: 'Logged out' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify email using the raw token from the verification link.
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'token is required' });

    const user = await User.findOne({
      emailVerificationToken: hashToken(token),
      emailVerificationExpires: { $gt: new Date() },
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({ message: 'Email verified' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Request a password reset. Always responds 200 to avoid leaking which emails exist.
export const forgotPassword = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'email is required' });

    const user = await User.findOne({ email });
    const response = { message: 'If that email exists, a reset link has been sent.' };

    if (!user) return res.json(response);

    const { raw, hashed } = createHashedToken();
    user.passwordResetToken = hashed;
    user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_TTL);
    await user.save();

    // In production this token would be emailed as a reset link.
    if (exposeTokens) response.resetToken = raw;
    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Complete a password reset with the raw token and a new password.
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: 'token and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({
      passwordResetToken: hashToken(token),
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Force re-login everywhere after a password change.
    await revokeAllForUser(user._id);

    res.json({ message: 'Password has been reset. Please log in again.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
