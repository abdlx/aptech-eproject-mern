// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker backend by Munawwar).
// ============================================================================

import Notification from '../models/Notification.js';
import User from '../models/User.js';

// Delivery channels. Email and push are no-op stubs behind a stable interface so
// they can be swapped for nodemailer / web-push later without touching callers.
async function deliverEmail(user, notification) {
  // Stub: integrate nodemailer here. Kept as a no-op so the app runs offline.
  if (process.env.LOG_DELIVERY === 'true') {
    console.log(`[email:noop] -> ${user.email}: ${notification.message}`);
  }
}

async function deliverPush(user, notification) {
  // Stub: integrate web-push / FCM here. No-op by default.
  if (process.env.LOG_DELIVERY === 'true') {
    console.log(`[push:noop] -> ${user._id}: ${notification.message}`);
  }
}

// Creates an in-app notification and fans it out to enabled channels. Central
// entry point: controllers/scheduler should call this instead of Notification.create.
export async function notify({ user, message, type = 'general' }) {
  const notification = await Notification.create({ user, message, type });

  const recipient = await User.findById(user).select('email preferences');
  if (recipient?.preferences?.notificationsEnabled) {
    await Promise.allSettled([
      deliverEmail(recipient, notification),
      deliverPush(recipient, notification),
    ]);
  }

  return notification;
}

export default { notify };
