# Bolu Deployment Guide

Use this guide to create a temporary public testing link for family members in different cities.

## Recommended Hosting

- Frontend: Vercel
- Backend: Render
- Database: hosted PostgreSQL on Render, Railway, Neon, or Supabase

Bolu uses PostgreSQL through SQLAlchemy. A local database is fine for development, but it is not suitable for public testing because other people cannot reach it from the internet.

## Environment Variables

### Frontend

Set this in Vercel:

```bash
NEXT_PUBLIC_API_URL=https://your-render-backend-url.onrender.com
```

If this is not set locally, the frontend falls back to:

```bash
http://127.0.0.1:8000
```

### Backend

Set these in Render:

```bash
DATABASE_URL=postgresql://user:password@host:5432/database
FRONTEND_URL=https://your-vercel-frontend-url.vercel.app
```

Optional, only if you need to allow more than one deployed frontend:

```bash
CORS_ORIGINS=https://domain-one.com,https://domain-two.com
```

Local development remains allowed by default:

```bash
http://localhost:3000
http://127.0.0.1:3000
```

## Backend Health Check

The backend exposes:

```bash
GET /health
```

Expected response:

```json
{
  "status": "ok"
}
```

Use this before connecting the frontend.

## Deploy Backend on Render

You can deploy manually or use `render.yaml`.

### Manual Render Settings

- Service type: Web Service
- Root directory: repository root
- Runtime: Python
- Build command:

```bash
pip install -r requirements.txt
```

- Start command:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

- Environment variables:
  - `DATABASE_URL`
  - `FRONTEND_URL`

### Render Blueprint

The repo includes `render.yaml`. If you use Render Blueprint, it will use:

```bash
pip install -r requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

You still need to set the real `DATABASE_URL` and `FRONTEND_URL` values in Render.

## Deploy Frontend on Vercel

Use these Vercel settings:

- Framework preset: Next.js
- Root directory: `frontend`
- Install command: default (`npm install`)
- Build command:

```bash
npm run build
```

- Output directory: leave default for Next.js
- Environment variable:

```bash
NEXT_PUBLIC_API_URL=https://your-render-backend-url.onrender.com
```

After changing `NEXT_PUBLIC_API_URL`, redeploy the Vercel project.

## Database Setup

Recommended path:

1. Create a PostgreSQL database on Render, Railway, Neon, or Supabase.
2. Copy its connection string.
3. Put that value into Render as `DATABASE_URL`.
4. Deploy or redeploy the backend.

The backend creates the existing tables automatically on startup with SQLAlchemy.
If your provider gives a URL that starts with `postgres://`, the backend normalizes it to `postgresql://` automatically.

## Exact Order to Get a Public Test Link

1. Push your latest code to GitHub.
2. Create a hosted PostgreSQL database.
3. Copy the PostgreSQL connection string.
4. Create a Render Web Service from the GitHub repo.
5. Use repository root as the backend root directory.
6. Set Render build command:
   - `pip install -r requirements.txt`
7. Set Render start command:
   - `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
8. Set Render env var:
   - `DATABASE_URL=your_postgres_url`
9. Deploy the backend.
10. Open `https://your-render-backend-url.onrender.com/health`.
11. Confirm it returns `{ "status": "ok" }`.
12. Create a Vercel project from the same GitHub repo.
13. Set Vercel root directory to `frontend`.
14. Set Vercel env var:
   - `NEXT_PUBLIC_API_URL=https://your-render-backend-url.onrender.com`
15. Deploy the frontend.
16. Copy the Vercel domain.
17. Go back to Render and set:
   - `FRONTEND_URL=https://your-vercel-domain.vercel.app`
18. Redeploy the backend.
19. Open the Vercel link and test the main flow.

## Local Development

Backend:

```bash
uvicorn backend.main:app --reload
```

Frontend:

```bash
cd frontend
npm run dev
```
