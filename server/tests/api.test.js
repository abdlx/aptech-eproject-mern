// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker backend by Munawwar).
// ============================================================================

import 'dotenv/config';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import app from '../server.js';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import { fireDueReminders } from '../services/reminderScheduler.js';

// Integration tests run against the configured MongoDB. They create isolated
// users (unique emails) and clean up their data afterward. The scheduler is not
// started because we import `app` rather than running server.js directly.

let server;
let base;
const createdUserIds = [];

function unique(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

async function api(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}

async function register(prefix = 'test') {
  const u = unique(prefix);
  const { status, data } = await api('/api/auth/register', {
    method: 'POST',
    body: { username: u.slice(0, 28), name: 'Test User', email: `${u}@example.com`, password: 'secret123' },
  });
  assert.equal(status, 201, `register failed: ${JSON.stringify(data)}`);
  createdUserIds.push(data._id);
  return data;
}

before(async () => {
  await connectDB();
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  // Clean up users created by this run.
  if (createdUserIds.length) {
    await User.deleteMany({ _id: { $in: createdUserIds } });
  }
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
});

test('health check', async () => {
  const { status, data } = await api('/api/health');
  assert.equal(status, 200);
  assert.equal(data.status, 'ok');
});

test('register returns access + refresh tokens and a verification token', async () => {
  const user = await register();
  assert.ok(user.token, 'access token present');
  assert.ok(user.refreshToken, 'refresh token present');
  assert.ok(user.verificationToken, 'verification token exposed in dev');
  assert.equal(user.isEmailVerified, false);
  assert.equal(user.role, 'user');
});

test('refresh token rotates and issues a new access token', async () => {
  const user = await register();
  const { status, data } = await api('/api/auth/refresh', {
    method: 'POST',
    body: { refreshToken: user.refreshToken },
  });
  assert.equal(status, 200);
  assert.ok(data.token);
  assert.ok(data.refreshToken);
  assert.notEqual(data.refreshToken, user.refreshToken, 'refresh token rotated');

  // Old refresh token is now revoked.
  const reuse = await api('/api/auth/refresh', {
    method: 'POST',
    body: { refreshToken: user.refreshToken },
  });
  assert.equal(reuse.status, 401, 'rotated-out token rejected');
});

test('logout revokes the refresh token', async () => {
  const user = await register();
  const out = await api('/api/auth/logout', { method: 'POST', body: { refreshToken: user.refreshToken } });
  assert.equal(out.status, 200);
  const after = await api('/api/auth/refresh', { method: 'POST', body: { refreshToken: user.refreshToken } });
  assert.equal(after.status, 401);
});

test('email verification flow', async () => {
  const user = await register();
  const { status, data } = await api('/api/auth/verify-email', {
    method: 'POST',
    body: { token: user.verificationToken },
  });
  assert.equal(status, 200, JSON.stringify(data));
  const profile = await api('/api/users', { token: user.token });
  assert.equal(profile.data.isEmailVerified, true);
});

test('forgot + reset password, and old password stops working', async () => {
  const u = unique('reset');
  const email = `${u}@example.com`;
  const reg = await api('/api/auth/register', {
    method: 'POST',
    body: { username: u.slice(0, 28), name: 'Reset User', email, password: 'secret123' },
  });
  createdUserIds.push(reg.data._id);

  const forgot = await api('/api/auth/forgot-password', { method: 'POST', body: { email } });
  assert.equal(forgot.status, 200);
  assert.ok(forgot.data.resetToken, 'reset token exposed in dev');

  const reset = await api('/api/auth/reset-password', {
    method: 'POST',
    body: { token: forgot.data.resetToken, password: 'newsecret1' },
  });
  assert.equal(reset.status, 200);

  const oldLogin = await api('/api/auth/login', { method: 'POST', body: { email, password: 'secret123' } });
  assert.equal(oldLogin.status, 401, 'old password rejected');
  const newLogin = await api('/api/auth/login', { method: 'POST', body: { email, password: 'newsecret1' } });
  assert.equal(newLogin.status, 200, 'new password works');
});

test('goal is auto-achieved after logging a workout, and notifies', async () => {
  const user = await register('goal');
  const goal = await api('/api/goals', {
    method: 'POST',
    token: user.token,
    body: { title: 'Log 1 workout', metric: 'workout', target: 1 },
  });
  assert.equal(goal.status, 201);
  assert.equal(goal.data.achieved, false);

  await api('/api/workouts', {
    method: 'POST',
    token: user.token,
    body: { name: 'Push', category: 'strength', exercises: [{ name: 'Bench', sets: 3, reps: 8, weight: 60 }] },
  });

  const goals = await api('/api/goals', { token: user.token });
  assert.equal(goals.data[0].achieved, true, 'goal marked achieved');

  const notifs = await api('/api/notifications', { token: user.token });
  const types = notifs.data.map((n) => n.type);
  assert.ok(types.includes('goal'), 'goal notification created');
  assert.ok(types.includes('workout'), 'workout notification created');
});

test('follow creates a notification for the target', async () => {
  const a = await register('follower');
  const b = await register('followee');
  const follow = await api(`/api/users/${b._id}/follow`, { method: 'POST', token: a.token });
  assert.equal(follow.status, 200);

  // Cannot follow twice.
  const again = await api(`/api/users/${b._id}/follow`, { method: 'POST', token: a.token });
  assert.equal(again.status, 409);

  const followers = await api(`/api/users/${b._id}/followers`, { token: b.token });
  assert.equal(followers.data.length, 1);

  const notifs = await api('/api/notifications', { token: b.token });
  assert.ok(notifs.data.some((n) => /started following/.test(n.message)), 'follow notification created');
});

test('forum post + reply notifies the post author', async () => {
  const author = await register('author');
  const replier = await register('replier');

  const post = await api('/api/forum', {
    method: 'POST',
    token: author.token,
    body: { title: 'Best split?', body: 'What split do you run?', tags: ['training'] },
  });
  assert.equal(post.status, 201);

  const reply = await api(`/api/forum/${post.data._id}/replies`, {
    method: 'POST',
    token: replier.token,
    body: { message: 'PPL for me.' },
  });
  assert.equal(reply.status, 201);
  assert.equal(reply.data.replies.length, 1);

  const list = await api('/api/forum?page=1&limit=10', { token: author.token });
  assert.ok(Array.isArray(list.data.items), 'paginated envelope');
  assert.ok(list.data.meta.total >= 1);

  const notifs = await api('/api/notifications', { token: author.token });
  assert.ok(notifs.data.some((n) => /replied to your post/.test(n.message)), 'reply notification created');
});

test('reminder scheduler fires due reminders into notifications', async () => {
  const user = await register('reminder');
  // A reminder already in the past should fire on the next scheduler tick.
  await api('/api/reminders', {
    method: 'POST',
    token: user.token,
    body: { title: 'Leg day', type: 'workout', time: new Date(Date.now() - 1000).toISOString() },
  });

  const fired = await fireDueReminders();
  assert.ok(fired >= 1, 'at least one reminder fired');

  const notifs = await api('/api/notifications', { token: user.token });
  assert.ok(notifs.data.some((n) => /Reminder: Leg day/.test(n.message)), 'reminder notification created');
});

test('admin-only feedback routes are gated by role', async () => {
  const user = await register('nonadmin');
  const denied = await api('/api/feedback/all', { token: user.token });
  assert.equal(denied.status, 403, 'non-admin blocked');

  // Promote to admin directly, then the route works.
  await User.findByIdAndUpdate(user._id, { role: 'admin' });
  const allowed = await api('/api/feedback/all', { token: user.token });
  assert.equal(allowed.status, 200);
  assert.ok(Array.isArray(allowed.data.items));
});

test('pagination envelope on workouts when page param is present', async () => {
  const user = await register('paging');
  for (let i = 0; i < 3; i += 1) {
    await api('/api/workouts', {
      method: 'POST',
      token: user.token,
      body: { name: `W${i}`, category: 'strength', exercises: [{ name: 'X', sets: 1, reps: 1, weight: 1 }] },
    });
  }
  const bare = await api('/api/workouts', { token: user.token });
  assert.ok(Array.isArray(bare.data), 'bare array without page param');

  const paged = await api('/api/workouts?page=1&limit=2', { token: user.token });
  assert.ok(Array.isArray(paged.data.items));
  assert.equal(paged.data.items.length, 2);
  assert.equal(paged.data.meta.limit, 2);
  assert.ok(paged.data.meta.total >= 3);
  assert.equal(paged.data.meta.hasMore, true);
});

test('unauthenticated access is rejected', async () => {
  const { status } = await api('/api/workouts');
  assert.equal(status, 401);
});
