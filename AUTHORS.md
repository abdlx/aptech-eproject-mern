# Authors & Attribution

This document records who wrote what in the Fitness Tracker project.

- **Munawwar** — original author of the base application (backend + frontend).
- **Abdullah** — added features on top of Munawwar's base in a later work session.

> Note on method: this project is **not** under version control (no git history) and
> the source files contain **no author metadata**. Attribution below is based on the
> record of the session in which Abdullah's additions were made. Everything not
> listed as "created" or "modified" by Abdullah is Munawwar's original work.
> Each source file also carries a header comment reflecting the same split.

---

## Backend (`server/`)

### Created by Abdullah (wholly new files)

| File | Purpose |
|------|---------|
| `controllers/followController.js` | Follow / unfollow / followers / following |
| `controllers/forumController.js` | Forum posts, replies, likes, image posts |
| `controllers/goalController.js` | Goal CRUD |
| `middleware/adminMiddleware.js` | Admin-role route gate |
| `middleware/rateLimiter.js` | Auth rate limiting |
| `services/notificationService.js` | Central notify() + email/push stubs |
| `services/goalService.js` | Auto-evaluates goals, fires achievement notifications |
| `services/refreshTokenService.js` | Issue / rotate / revoke refresh tokens |
| `services/reminderScheduler.js` | Cron job that fires due reminders |
| `models/Goal.js` | Goal schema |
| `models/RefreshToken.js` | Hashed refresh-token schema (TTL-indexed) |
| `models/ForumPost.js` | Forum post + embedded replies, image, likes |
| `routes/goalRoutes.js` | `/api/goals` |
| `routes/forumRoutes.js` | `/api/forum` (incl. image upload + like) |
| `migrations/008_create_goals.js` | Goals collection |
| `migrations/009_create_forumposts.js` | Forum posts collection |
| `migrations/010_create_refreshtokens.js` | Refresh tokens collection |
| `scripts/makeAdmin.js` | Promote a user to admin |
| `utils/pagination.js` | Shared pagination helpers |
| `utils/tokens.js` | Hashed token generation (verify / reset) |
| `tests/api.test.js` | Integration test suite (13 tests) |

### Modified by Abdullah (Munawwar's originals, extended)

| File | What Abdullah changed |
|------|------------------------|
| `controllers/authController.js` | Refresh tokens, logout, email verification, forgot/reset password |
| `controllers/feedbackController.js` | Admin listing + reply endpoints, notify on reply |
| `controllers/workoutController.js` | notify() service, goal checks, pagination |
| `controllers/nutritionController.js` | notify() service, goal checks, pagination |
| `controllers/progressController.js` | notify() service, goal checks, pagination |
| `controllers/userController.js` | (import wiring for follow routes) |
| `middleware/uploadMiddleware.js` | Refactored into a factory; added `postUpload` (/uploads/posts) |
| `models/User.js` | Added role, email-verification, password-reset, followers/following fields |
| `models/Feedback.js` | Added adminReply / repliedBy / repliedAt fields |
| `routes/authRoutes.js` | New auth endpoints + rate limiter |
| `routes/feedbackRoutes.js` | Admin-only feedback routes |
| `routes/userRoutes.js` | Follow / followers / following routes |
| `server.js` | Mounted goal + forum routes, started scheduler, test-safe boot |
| `utils/generateToken.js` | Shortened access-token TTL (refresh-token model) |
| `package.json` | `test` / `make-admin` scripts; express-rate-limit, node-cron deps |
| `.env.example` | New config knobs (token TTLs, EXPOSE_TOKENS, scheduler, rate limit) |

### Unchanged — Munawwar's original backend

`config/db.js`, `config/dns.js`, `controllers/notificationController.js`,
`controllers/reminderController.js`, `controllers/reportController.js`,
`middleware/authMiddleware.js`, `models/Notification.js`, `models/Nutrition.js`,
`models/Progress.js`, `models/Reminder.js`, `models/Workout.js`,
`routes/notificationRoutes.js`, `routes/nutritionRoutes.js`,
`routes/progressRoutes.js`, `routes/reminderRoutes.js`, `routes/reportRoutes.js`,
`routes/workoutRoutes.js`, `migrations/001`–`007`, `migrations/_migrationModel.js`,
`migrations/runner.js`.

---

## Frontend (`frontend/src/`)

| File | Attribution |
|------|-------------|
| `main.jsx` | **Munawwar** (whole app). **Abdullah** added the Live Feed: `FeedComposer`, `FeedPost`, `FeedView`, feed state/data functions, feed/heart/comment/image icons, and nav wiring. |
| `styles.css` | **Munawwar** (whole stylesheet). **Abdullah** added the `Live Feed` style block at the end. |

---

## Feature summary

**Munawwar (base app):** user auth (register/login/JWT), profiles + picture upload,
workouts, nutrition, progress, reminders, notifications, feedback, reports (CSV/PDF),
dashboard, migrations framework, and the entire original React UI.

**Abdullah (this session):** reminder scheduler, goals, followers, forum (posts +
replies + likes + workout-photo posts), notification delivery layer, auth rate
limiting, password reset, email verification, refresh tokens + logout, pagination,
admin feedback replies, an integration test suite, and the frontend **Live Feed**.
