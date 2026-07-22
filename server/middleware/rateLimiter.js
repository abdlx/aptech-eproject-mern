// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker backend by Munawwar).
// ============================================================================

import rateLimit from 'express-rate-limit';

// Allows tests (and local load work) to turn limiting off without changing routes.
const disabled = process.env.DISABLE_RATE_LIMIT === 'true';
const passthrough = (req, res, next) => next();

// Throttles authentication attempts (login, register, password reset) to blunt
// brute-force and credential-stuffing. 10 requests per 15 minutes per IP.
export const authLimiter = disabled ? passthrough : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT, 10) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again later.' },
});

// A looser limiter for general API traffic, if mounted app-wide.
export const apiLimiter = disabled ? passthrough : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.API_RATE_LIMIT, 10) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please slow down.' },
});
