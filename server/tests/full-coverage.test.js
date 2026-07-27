// ============================================================================
// Full endpoint coverage sweep. api.test.js and tracking.test.js already cover
// auth, the core create/list flows, and the calculation layer in depth. This
// file exists to hit every remaining route at least once — every update and
// delete endpoint, the social graph, reports, admin feedback, and the food/
// routine/forum single-item routes — so no endpoint in server/routes is left
// completely unexercised.
// ============================================================================

import 'dotenv/config';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import app from '../server.js';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Workout from '../models/Workout.js';
import Nutrition from '../models/Nutrition.js';
import Progress from '../models/Progress.js';
import Food from '../models/Food.js';
import Goal from '../models/Goal.js';
import Routine from '../models/Routine.js';
import Reminder from '../models/Reminder.js';
import Feedback from '../models/Feedback.js';
import ForumPost from '../models/ForumPost.js';

let server;
let base;
const createdUserIds = [];

function unique(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

async function api(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const config = { method, headers };
  if (body instanceof FormData) {
    config.body = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(body);
  }
  const res = await fetch(`${base}${path}`, config);
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    return { status: res.status, data, headers: res.headers };
  }
  // Non-JSON bodies (PDF/CSV) — read as text/buffer without trying to parse.
  const buf = await res.arrayBuffer();
  return { status: res.status, data: buf, headers: res.headers };
}

async function register(prefix = 'cov') {
  const u = unique(prefix);
  const { status, data } = await api('/api/auth/register', {
    method: 'POST',
    body: { username: u.slice(0, 28), name: 'Coverage User', email: `${u}@example.com`, password: 'secret123' },
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
  if (createdUserIds.length) {
    const filter = { user: { $in: createdUserIds } };
    await Promise.all([
      Workout.deleteMany(filter),
      Nutrition.deleteMany(filter),
      Progress.deleteMany(filter),
      Goal.deleteMany(filter),
      Routine.deleteMany(filter),
      Reminder.deleteMany(filter),
      Feedback.deleteMany(filter),
      ForumPost.deleteMany({ user: { $in: createdUserIds } }),
      Food.deleteMany({ owner: { $in: createdUserIds } }),
      User.deleteMany({ _id: { $in: createdUserIds } }),
    ]);
  }
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
});

// --- Users: search, dashboard, profile picture, social graph ---------------

test('users: search finds by name/username, dashboard returns stat counters', async () => {
  const user = await register('userssearch');
  const marker = unique('Findme');
  await api('/api/users', { method: 'PUT', token: user.token, body: { name: marker } });

  const search = await api(`/api/users/search?search=${encodeURIComponent(marker)}`, { token: user.token });
  assert.equal(search.status, 200);
  assert.ok(search.data.some((u) => u._id === user._id), 'renamed user found by search');

  await api('/api/workouts', {
    method: 'POST',
    token: user.token,
    body: { name: 'Dash check', category: 'strength', exercises: [{ name: 'Row', sets: 1, reps: 1, weight: 1 }] },
  });
  const dash = await api('/api/users/dashboard', { token: user.token });
  assert.equal(dash.status, 200);
  assert.equal(dash.data.stats.totalWorkouts, 1);
  assert.ok(Array.isArray(dash.data.recentWorkouts));
});

test('users: profile picture upload updates the stored path', async () => {
  const user = await register('avatar');
  const pixel = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000155bfabd40000000049454e44ae426082',
    'hex',
  );
  const formData = new FormData();
  formData.append('profilePicture', new Blob([pixel], { type: 'image/png' }), 'pixel.png');
  const { status, data } = await api('/api/users/profile-picture', { method: 'PUT', token: user.token, body: formData });
  assert.equal(status, 200, JSON.stringify(data));
  assert.ok(data.profilePicture?.startsWith('/uploads/profilePictures/'), 'stored profile picture path returned');
});

test('users: follow / unfollow / followers / following round-trip', async () => {
  const a = await register('followera');
  const b = await register('followerb');

  const follow = await api(`/api/users/${b._id}/follow`, { method: 'POST', token: a.token });
  assert.equal(follow.status, 200);

  const following = await api(`/api/users/${a._id}/following`, { token: a.token });
  assert.equal(following.status, 200);
  assert.ok(following.data.some((u) => u._id === b._id), 'b appears in a\'s following list');

  const unfollow = await api(`/api/users/${b._id}/follow`, { method: 'DELETE', token: a.token });
  assert.equal(unfollow.status, 200);

  const followersAfter = await api(`/api/users/${b._id}/followers`, { token: b.token });
  assert.equal(followersAfter.data.length, 0, 'follower removed after unfollow');
});

// --- Workouts: update + delete ----------------------------------------------

test('workouts: update changes fields and recomputes summary; delete removes it', async () => {
  const user = await register('workoutcrud');
  const created = await api('/api/workouts', {
    method: 'POST',
    token: user.token,
    body: { name: 'Original', category: 'strength', exercises: [{ name: 'Curl', sets: 3, reps: 10, weight: 10 }] },
  });
  assert.equal(created.status, 201);

  const updated = await api(`/api/workouts/${created.data._id}`, {
    method: 'PUT',
    token: user.token,
    body: { name: 'Renamed', exercises: [{ name: 'Curl', sets: 4, reps: 10, weight: 10 }] },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.name, 'Renamed');
  assert.equal(updated.data.summary.volume, 400, '4 x 10 x 10');

  const deleted = await api(`/api/workouts/${created.data._id}`, { method: 'DELETE', token: user.token });
  assert.equal(deleted.status, 200);

  const gone = await api('/api/workouts', { token: user.token });
  assert.ok(!gone.data.some((w) => w._id === created.data._id), 'workout no longer listed');
});

// --- Nutrition: list, update, delete -----------------------------------------

test('nutrition: bare list, update recomputes totals, delete removes the log', async () => {
  const user = await register('nutritioncrud');
  const created = await api('/api/nutrition', {
    method: 'POST',
    token: user.token,
    body: { mealType: 'snack', foods: [{ name: 'Bar', quantity: 1, unit: 'serving', calories: 200, protein: 5, carbs: 20, fats: 8 }] },
  });
  assert.equal(created.status, 201);

  const list = await api('/api/nutrition', { token: user.token });
  assert.ok(Array.isArray(list.data));
  assert.ok(list.data.some((n) => n._id === created.data._id));

  const updated = await api(`/api/nutrition/${created.data._id}`, {
    method: 'PUT',
    token: user.token,
    body: { foods: [{ name: 'Bigger bar', quantity: 1, unit: 'serving', calories: 400, protein: 10, carbs: 40, fats: 16 }] },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.totals.calories, 400, 'totals recomputed from new foods, not merged');

  const deleted = await api(`/api/nutrition/${created.data._id}`, { method: 'DELETE', token: user.token });
  assert.equal(deleted.status, 200);
});

// --- Progress: list, update, delete ------------------------------------------

test('progress: bare list, update, delete', async () => {
  const user = await register('progresscrud');
  const created = await api('/api/progress', { method: 'POST', token: user.token, body: { weight: 82 } });
  assert.equal(created.status, 201);

  const list = await api('/api/progress', { token: user.token });
  assert.ok(Array.isArray(list.data));
  assert.ok(list.data.some((p) => p._id === created.data._id));

  const updated = await api(`/api/progress/${created.data._id}`, { method: 'PUT', token: user.token, body: { weight: 81 } });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.weight, 81);

  const deleted = await api(`/api/progress/${created.data._id}`, { method: 'DELETE', token: user.token });
  assert.equal(deleted.status, 200);
});

// --- Reports: PDF + CSV -------------------------------------------------------

test('reports: pdf and csv downloads are generated with the right content type', async () => {
  const user = await register('reports');
  await api('/api/workouts', {
    method: 'POST',
    token: user.token,
    body: { name: 'Report seed', category: 'strength', exercises: [{ name: 'Press', sets: 3, reps: 5, weight: 40 }] },
  });

  const pdf = await api('/api/reports/pdf', { token: user.token });
  assert.equal(pdf.status, 200);
  assert.ok(pdf.headers.get('content-type').includes('application/pdf'));
  assert.ok(pdf.data.byteLength > 100, 'pdf body is non-trivial');

  const csv = await api('/api/reports/csv', { token: user.token });
  assert.equal(csv.status, 200);
  assert.ok(csv.headers.get('content-type').includes('text/csv'));
  const text = Buffer.from(csv.data).toString('utf-8');
  assert.ok(text.includes('Report seed'), 'csv includes the logged workout name');
});

// --- Notifications: mark read + delete ---------------------------------------

test('notifications: mark as read and delete, with ownership enforced', async () => {
  const owner = await register('notifowner');
  const other = await register('notifother');
  await api('/api/progress', { method: 'POST', token: owner.token, body: { weight: 70 } }); // generates a notification

  const list = await api('/api/notifications', { token: owner.token });
  assert.ok(list.data.length >= 1);
  const target = list.data[0];

  const crossRead = await api(`/api/notifications/${target._id}/read`, { method: 'PUT', token: other.token });
  assert.equal(crossRead.status, 401, 'another user cannot mark it read');

  const read = await api(`/api/notifications/${target._id}/read`, { method: 'PUT', token: owner.token });
  assert.equal(read.status, 200);
  assert.equal(read.data.isRead, true);

  const del = await api(`/api/notifications/${target._id}`, { method: 'DELETE', token: owner.token });
  assert.equal(del.status, 200);
});

// --- Feedback: create/list (user) + reply (admin) -----------------------------

test('feedback: user submits and lists their own; admin reply notifies the author', async () => {
  const user = await register('feedbackuser');
  const created = await api('/api/feedback', { method: 'POST', token: user.token, body: { subject: 'Bug', message: 'Something broke' } });
  assert.equal(created.status, 201);

  const mine = await api('/api/feedback', { token: user.token });
  assert.equal(mine.status, 200);
  assert.ok(mine.data.some((f) => f._id === created.data._id));

  await User.findByIdAndUpdate(user._id, { role: 'admin' });
  const replied = await api(`/api/feedback/${created.data._id}/reply`, {
    method: 'PUT',
    token: user.token,
    body: { reply: 'Thanks, fixed.', status: 'resolved' },
  });
  assert.equal(replied.status, 200);
  assert.equal(replied.data.status, 'resolved');
  assert.equal(replied.data.adminReply, 'Thanks, fixed.');
});

// --- Reminders: list, update, delete ------------------------------------------

test('reminders: list, update, delete', async () => {
  const user = await register('remindercrud');
  const created = await api('/api/reminders', {
    method: 'POST',
    token: user.token,
    body: { title: 'Cardio', type: 'workout', time: new Date(Date.now() + 3600_000).toISOString() },
  });
  assert.equal(created.status, 201);

  const list = await api('/api/reminders', { token: user.token });
  assert.ok(list.data.some((r) => r._id === created.data._id));

  const updated = await api(`/api/reminders/${created.data._id}`, { method: 'PUT', token: user.token, body: { title: 'Cardio (moved)' } });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.title, 'Cardio (moved)');

  const deleted = await api(`/api/reminders/${created.data._id}`, { method: 'DELETE', token: user.token });
  assert.equal(deleted.status, 200);
});

// --- Goals: update, delete -----------------------------------------------------

test('goals: update and delete', async () => {
  const user = await register('goalcrud');
  const created = await api('/api/goals', { method: 'POST', token: user.token, body: { title: 'Run 10k', metric: 'workout', target: 3 } });
  assert.equal(created.status, 201);

  const updated = await api(`/api/goals/${created.data._id}`, { method: 'PUT', token: user.token, body: { target: 5 } });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.target, 5);

  const deleted = await api(`/api/goals/${created.data._id}`, { method: 'DELETE', token: user.token });
  assert.equal(deleted.status, 200);

  const goals = await api('/api/goals', { token: user.token });
  assert.ok(!goals.data.some((g) => g._id === created.data._id));
});

// --- Forum: single post, delete, like ------------------------------------------

test('forum: get single post, like/unlike toggle, delete by author', async () => {
  const author = await register('forumauthor');
  const liker = await register('forumliker');

  const formData = new FormData();
  formData.append('title', 'PR day');
  formData.append('body', 'Hit a new squat max.');
  const post = await api('/api/forum', { method: 'POST', token: author.token, body: formData });
  assert.equal(post.status, 201);

  const single = await api(`/api/forum/${post.data._id}`, { token: liker.token });
  assert.equal(single.status, 200);
  assert.equal(single.data.title, 'PR day');

  const liked = await api(`/api/forum/${post.data._id}/like`, { method: 'POST', token: liker.token });
  assert.equal(liked.status, 200);
  assert.equal(liked.data.likedByMe, true);
  assert.equal(liked.data.likeCount, 1);

  const unliked = await api(`/api/forum/${post.data._id}/like`, { method: 'POST', token: liker.token });
  assert.equal(unliked.data.likedByMe, false, 'second call toggles the like back off');

  const deniedDelete = await api(`/api/forum/${post.data._id}`, { method: 'DELETE', token: liker.token });
  assert.equal(deniedDelete.status, 403, 'non-author cannot delete');

  const deleted = await api(`/api/forum/${post.data._id}`, { method: 'DELETE', token: author.token });
  assert.equal(deleted.status, 200);

  const goneRes = await api(`/api/forum/${post.data._id}`, { token: author.token });
  assert.equal(goneRes.status, 404);
});

// --- Foods: update, delete, ownership -------------------------------------------

test('foods: owner can update/delete their own food; cannot touch another\'s', async () => {
  const owner = await register('foodowner');
  const other = await register('foodother');

  const created = await api('/api/foods', {
    method: 'POST',
    token: owner.token,
    body: { name: unique('HomemadeBar'), per100: { calories: 300, protein: 20, carbs: 30, fats: 10 } },
  });
  assert.equal(created.status, 201);

  const crossUpdate = await api(`/api/foods/${created.data._id}`, { method: 'PUT', token: other.token, body: { name: 'Hijacked' } });
  assert.equal(crossUpdate.status, 404, 'not editable by a non-owner');

  const updated = await api(`/api/foods/${created.data._id}`, { method: 'PUT', token: owner.token, body: { name: 'HomemadeBar v2' } });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.name, 'HomemadeBar v2');

  const crossDelete = await api(`/api/foods/${created.data._id}`, { method: 'DELETE', token: other.token });
  assert.equal(crossDelete.status, 404);

  const deleted = await api(`/api/foods/${created.data._id}`, { method: 'DELETE', token: owner.token });
  assert.equal(deleted.status, 200);
});

// --- Routines: single get, update, archive vs. hard delete ------------------------

test('routines: get single, update, soft-archive, and hard delete', async () => {
  const user = await register('routinecrud');
  const created = await api('/api/routines', {
    method: 'POST',
    token: user.token,
    body: { name: 'Pull Day', category: 'strength', exercises: [{ name: 'Row', targetSets: 3, targetReps: 10, targetWeight: 40 }] },
  });
  assert.equal(created.status, 201);

  const single = await api(`/api/routines/${created.data._id}`, { token: user.token });
  assert.equal(single.status, 200);
  assert.equal(single.data.name, 'Pull Day');

  const updated = await api(`/api/routines/${created.data._id}`, { method: 'PUT', token: user.token, body: { name: 'Pull Day A' } });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.name, 'Pull Day A');

  const archived = await api(`/api/routines/${created.data._id}`, { method: 'DELETE', token: user.token });
  assert.equal(archived.status, 200);
  assert.equal(archived.data.routine.isArchived, true, 'default delete archives rather than removing');

  const stillReadable = await api(`/api/routines/${created.data._id}`, { token: user.token });
  assert.equal(stillReadable.status, 200, 'archived routine is still fetchable directly');

  const hardDeleted = await api(`/api/routines/${created.data._id}?hard=true`, { method: 'DELETE', token: user.token });
  assert.equal(hardDeleted.status, 200);

  const goneRes = await api(`/api/routines/${created.data._id}`, { token: user.token });
  assert.equal(goneRes.status, 404);
});

test('unknown route returns the 404 fallback handler', async () => {
  const { status, data } = await api('/api/not-a-real-route');
  assert.equal(status, 404);
  assert.equal(data.message, 'Route not found');
});
