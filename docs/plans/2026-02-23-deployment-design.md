# PropertyFlow Deployment Design

**Date:** 2026-02-23
**Decision:** Vercel (Frontend) + Render (Backend + PostgreSQL) — Free Tier

## Architecture

```
[Browser] → [Vercel CDN] → Next.js Frontend (SSR/Static)
                ↓ API calls (HTTPS)
           [Render] → FastAPI Backend → PostgreSQL (Render)
```

- Frontend: `propertyflow.vercel.app`
- Backend: `propertyflow-api.onrender.com`
- Database: Render PostgreSQL (internal network)

## Platform Choice

| Criteria | Vercel | Render |
|----------|--------|--------|
| Cost | Free | Free (750h/mo backend, 256MB DB for 90 days) |
| Cold starts | None | ~30s after 15min inactivity |
| Credit card | No | No |
| Setup complexity | Low (GitHub connect) | Medium (Dockerfile needed) |

## What Needs to Be Built

### 1. Alembic Initial Migration
Generate migration from existing SQLAlchemy models. The `alembic/` directory exists with proper config but `versions/` is empty.

### 2. Backend Dockerfile
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Render sets `$PORT` automatically. Container runs migrations then starts uvicorn.

### 3. CORS Configuration
Current CORS in `main.py` handles localhost variants. Must also allow the Vercel production domain. The existing `settings.FRONTEND_URL` approach works — just set it to the Vercel URL on Render.

### 4. Environment Variables

**Vercel:**
| Variable | Value |
|----------|-------|
| NEXT_PUBLIC_API_URL | `https://propertyflow-api.onrender.com` |

**Render (Backend):**
| Variable | Value |
|----------|-------|
| DATABASE_URL | Auto-provided by Render PostgreSQL |
| SECRET_KEY | Generated 32+ char random string |
| FRONTEND_URL | `https://propertyflow.vercel.app` |
| CLOUDFLARE_ACCOUNT_ID | (empty — later) |
| CLOUDFLARE_API_TOKEN | (empty — later) |
| MUX_TOKEN_ID | (empty — later) |
| MUX_TOKEN_SECRET | (empty — later) |
| RESEND_API_KEY | (empty — later) |

### 5. Database Seeding
After deployment, run seed script to populate demo data:
`python -m app.services.seed`

## Deployment Flow

1. Prepare code: Dockerfile, migrations, verify CORS
2. Push to GitHub
3. Vercel: Connect repo → set root to `frontend/` → set env var → deploy
4. Render: Create PostgreSQL → Create Web Service from repo → set root to `backend/` → set env vars → deploy
5. Test end-to-end: signup, login, create listing, view property page, lead capture

## Trade-offs Accepted

- **Cold starts:** ~30s on first request after 15min inactivity. Acceptable for demo/portfolio.
- **90-day DB:** Render free PostgreSQL expires after 90 days. Can recreate + reseed.
- **No custom domain:** Using default `.vercel.app` and `.onrender.com` subdomains initially.
