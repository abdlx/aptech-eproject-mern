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
| `services/nutritionMath.js` | Unit→gram conversion, per-100 scaling, macro/calorie reconciliation |
| `services/workoutMath.js` | Set-log volume, completion counts, session summaries |
| `services/targetService.js` | BMR/TDEE (Mifflin-St Jeor) → per-user calorie & macro targets |
| `models/Food.js` | Food reference table (per-100 macros, serving sizes, private/global) |
| `models/Routine.js` | Reusable workout template |
| `controllers/foodController.js` | Food search, custom foods, portion preview |
| `controllers/routineController.js` | Routine CRUD + start-session |
| `routes/foodRoutes.js` | `/api/foods` |
| `routes/routineRoutes.js` | `/api/routines` |
| `data/seedFoods.js` | 58-item starter food table |
| `migrations/011_create_foods.js` | Foods collection + search indexes |
| `migrations/012_seed_foods.js` | Seeds the global food table (idempotent upsert) |
| `migrations/013_create_routines.js` | Routines collection |
| `migrations/014_backfill_totals.js` | Backfills meal totals + workout summaries on existing records |
| `tests/tracking.test.js` | Integration tests for the calculation layer (11 tests) |

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
| `models/User.js` | Added role, email-verification, password-reset, followers/following fields; `bodyStats` + `nutritionTargets` |
| `models/Workout.js` | Turned into a trackable session: routine link, status, timing, per-set `setLog`, denormalised `summary` |
| `models/Nutrition.js` | Food-table references, resolved per-entry macros, stored `totals` |
| `models/Goal.js` | Value metrics (calories/protein/volume/sessions) and `period` windows |
| `services/goalService.js` | Measures values not just record counts; period windows; fixed the write-source → metric mapping |
| `controllers/reportController.js` | Reads stored totals/summaries; adds a headline summary and macro/volume columns |
| `routes/workoutRoutes.js` | `/active`, `/:id/complete`, per-set logging routes |
| `routes/nutritionRoutes.js` | `/summary` daily rollup |
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
| `main.jsx` | **Munawwar** (whole app). **Abdullah** added the Live Feed (`FeedComposer`, `FeedPost`, `FeedView`, feed state/data functions, nav wiring); replaced the single-entry workout/meal forms with multi-row editors; added routine/session state and handlers, real per-user targets, and the daily macro panel. |
| `styles.css` | **Munawwar** (whole stylesheet). **Abdullah** added the `Live Feed` block and the `Food picker, routines & live sessions` block at the end. |
| `lib/calc.js` | **Abdullah** — client mirror of the server maths; replaced five duplicated inline calorie `reduce`s. |
| `lib/api.js` | **Munawwar**'s fetch helpers, extracted from `main.jsx` by **Abdullah** so feature modules share them. |
| `components/Icon.jsx` | **Munawwar**'s icon set, extracted by **Abdullah**, who added the routine/session icons. |
| `features/MealForm.jsx` | **Abdullah** — food-table type-ahead, multi-row meal editor, live portion scaling. |
| `features/Routines.jsx` | **Abdullah** — routine builder, routine list, live session tracker with per-set ticking and rest timer. |

---

## Feature summary

**Munawwar (base app):** user auth (register/login/JWT), profiles + picture upload,
workouts, nutrition, progress, reminders, notifications, feedback, reports (CSV/PDF),
dashboard, migrations framework, and the entire original React UI.

**Abdullah (session one):** reminder scheduler, goals, followers, forum (posts +
replies + likes + workout-photo posts), notification delivery layer, auth rate
limiting, password reset, email verification, refresh tokens + logout, pagination,
admin feedback replies, an integration test suite, and the frontend **Live Feed**.

**Abdullah (session two) — the tracking/calculation layer.** The app previously
stored fitness data but never calculated anything: calories were whatever number
the user typed, the `quantity`/`unit` fields were saved and then ignored, workouts
could only be logged after the fact one exercise at a time, and "nutrition goals"
counted log entries rather than calories. This session added:

- **A food reference table** (58 seeded foods) with per-100 macros and serving
  sizes, a search API, and user-created private foods.
- **Real portion maths** — unit→gram conversion, per-100 scaling, and Atwater
  (4/4/9) reconciliation so the macro donut and the calorie ring agree.
- **Routines and live sessions** — reusable templates that can be started,
  tracked set by set with a rest timer, and completed, producing volume and
  completion figures.
- **Multi-item forms** — meals and workouts now write the full arrays their
  schemas always supported instead of a hardcoded single element.
- **Per-user targets** derived from body stats via Mifflin-St Jeor, replacing the
  hardcoded 2,200 kcal / 140 g.
- **Value-based goals** over daily/weekly/monthly windows, plus a fix for weight
  goals never firing (the write source was passed where a metric name was expected).
