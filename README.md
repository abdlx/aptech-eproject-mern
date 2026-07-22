# Fitness Tracker

Fitness Tracker is a full-stack fitness app with account/profile management, workout and nutrition CRUD, progress charts, analytics, MongoDB reminders and notifications, search, feedback, and CSV/PDF reporting.

## Run locally

Requirements: Node.js 20+ and Docker.

```bash
docker compose up -d mongodb

cd server
npm install
npm run dev
```

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite development server proxies `/api` and `/uploads` to `http://localhost:5000`.

Configuration examples live in `server/.env.example` and `frontend/.env.example`. Change `JWT_SECRET`, restrict `CLIENT_ORIGIN`, and set an external `MONGO_URI` before deploying.

## API

The Express API is under `/api`. Authenticated endpoints accept `Authorization: Bearer <token>` and cover users, workouts, nutrition, progress, reminders, notifications, feedback, reports, and dashboard data. Use `GET /api/health` for a health check.

Uploaded profile images are served from `/uploads/profilePictures`. CSV and PDF report routes return real downloadable files.
