# PropertyFlow Deployment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deploy PropertyFlow to Vercel (frontend) + Render (backend + PostgreSQL) on free tiers.

**Architecture:** Next.js frontend served by Vercel CDN, FastAPI backend on Render with PostgreSQL. Alembic manages DB migrations. Backend Dockerfile runs migrations on startup then launches uvicorn.

**Tech Stack:** Next.js 16, FastAPI, SQLAlchemy, Alembic, PostgreSQL, Docker, Vercel, Render

---

### Task 1: Fix database.py for PostgreSQL compatibility

The current `database.py` creates a bare `create_engine(settings.DATABASE_URL)`. SQLite locally needs `check_same_thread=False`, and PostgreSQL in production needs no such arg. Make the engine creation conditional.

**Files:**
- Modify: `backend/app/core/database.py`

**Step 1: Update database.py with conditional engine config**

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.core.config import settings

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**Step 2: Verify backend still starts**

Run: `cd backend && python -c "from app.core.database import engine; print('OK:', engine.url)"`
Expected: `OK: sqlite:///./dev.db`

**Step 3: Commit**

```bash
git add backend/app/core/database.py
git commit -m "fix: add conditional connect_args for SQLite vs PostgreSQL"
```

---

### Task 2: Generate Alembic initial migration

The `alembic/` directory exists with proper `env.py` that imports all models, but `alembic/versions/` is empty. We need to generate the initial migration that creates all 6 tables.

**Files:**
- Create: `backend/alembic/versions/<auto>_initial_migration.py` (auto-generated)

**Step 1: Generate migration**

Run: `cd backend && python -m alembic revision --autogenerate -m "initial schema"`
Expected: Creates file in `alembic/versions/` with `create_table` operations for: users, agents, listings, listing_photos, listing_videos, leads

**Step 2: Inspect generated migration**

Read the generated file and verify it contains all 6 tables with correct columns and foreign keys.

**Step 3: Test migration applies cleanly**

Run: `cd backend && python -m alembic upgrade head`
Expected: Applies migration without errors (on local SQLite).

**Step 4: Commit**

```bash
git add backend/alembic/versions/
git commit -m "feat: add initial Alembic migration with all 6 tables"
```

---

### Task 3: Create backend Dockerfile

Render needs a Docker image to run the FastAPI backend. The Dockerfile should install dependencies, copy code, and run migrations before starting uvicorn.

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/.dockerignore`

**Step 1: Create Dockerfile**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Render sets PORT env var automatically
CMD alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

**Step 2: Create .dockerignore**

```
__pycache__/
*.pyc
*.pyo
.env
*.db
.pytest_cache/
tests/
venv/
.venv/
```

**Step 3: Test Docker build locally (optional, requires Docker)**

Run: `cd backend && docker build -t propertyflow-api .`
Expected: Image builds successfully.

**Step 4: Commit**

```bash
git add backend/Dockerfile backend/.dockerignore
git commit -m "feat: add Dockerfile for Render deployment"
```

---

### Task 4: Add render.yaml for infrastructure-as-code

Render can auto-detect services from a `render.yaml` at the repo root. This defines the backend web service and PostgreSQL database.

**Files:**
- Create: `render.yaml` (at repo root)

**Step 1: Create render.yaml**

```yaml
databases:
  - name: propertyflow-db
    plan: free
    databaseName: propertyflow
    user: propertyflow

services:
  - type: web
    name: propertyflow-api
    plan: free
    runtime: docker
    dockerfilePath: ./backend/Dockerfile
    dockerContext: ./backend
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: propertyflow-db
          property: connectionString
      - key: SECRET_KEY
        generateValue: true
      - key: FRONTEND_URL
        value: https://propertyflow.vercel.app
      - key: CLOUDFLARE_ACCOUNT_ID
        value: ""
      - key: CLOUDFLARE_API_TOKEN
        value: ""
      - key: MUX_TOKEN_ID
        value: ""
      - key: MUX_TOKEN_SECRET
        value: ""
      - key: RESEND_API_KEY
        value: ""
    healthCheckPath: /health
```

**Step 2: Commit**

```bash
git add render.yaml
git commit -m "feat: add render.yaml for Render infrastructure-as-code"
```

---

### Task 5: Update seed script for Alembic-managed databases

The current seed script calls `Base.metadata.create_all()` which bypasses Alembic. In production, migrations run on container start. The seed script should only insert data, not create tables.

**Files:**
- Modify: `backend/app/services/seed.py`

**Step 1: Update seed.py**

Remove `Base.metadata.create_all(bind=engine)` line. The seed script should assume the schema already exists (created by Alembic). Keep the rest of the logic the same.

```python
"""
Demo data seeder for PropertyFlow.

Usage:
    cd backend
    python -m app.services.seed

Creates a demo photographer, agent, and listing for showcasing the product.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.database import SessionLocal
from app.core.auth import hash_password
from app.models.user import User
from app.models.agent import Agent
from app.models.listing import Listing


def seed():
    db = SessionLocal()

    try:
        # Check if demo user already exists
        existing = db.query(User).filter(User.email == "demo@propertyflow.app").first()
        if existing:
            print("Demo data already exists. Skipping.")
            return

        # Create demo photographer
        user = User(
            email="demo@propertyflow.app",
            password_hash=hash_password("demo1234"),
            business_name="Demo Photography Co",
            subscription_tier="free",
        )
        db.add(user)
        db.flush()

        # Create demo agent
        agent = Agent(
            photographer_id=user.id,
            name="Sarah Johnson",
            email="sarah@demorealty.com",
            phone="512-555-0100",
            brokerage_name="Demo Realty Group",
        )
        db.add(agent)
        db.flush()

        # Create demo listing
        listing = Listing(
            photographer_id=user.id,
            agent_id=agent.id,
            slug="123-demo-street-austin-tx",
            address="123 Demo Street, Austin TX 78701",
            price=52500000,  # $525,000
            beds=4,
            baths=3,
            sqft=2400,
            description=(
                "Welcome to this stunning 4-bedroom home in the heart of Austin. "
                "Featuring an open floor plan with natural light throughout, modern "
                "kitchen with quartz countertops, and a spacious backyard perfect for "
                "entertaining. Minutes from downtown, parks, and top-rated schools."
            ),
            mls_number="TX-2026-0001",
            status="active",
        )
        db.add(listing)

        db.commit()
        print("Demo data created successfully!")
        print(f"  Email: demo@propertyflow.app")
        print(f"  Password: demo1234")
        print(f"  Listing slug: 123-demo-street-austin-tx")

    except Exception as e:
        db.rollback()
        print(f"Error creating demo data: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
```

**Step 2: Commit**

```bash
git add backend/app/services/seed.py
git commit -m "fix: remove Base.metadata.create_all from seed script (use Alembic)"
```

---

### Task 6: Push to GitHub and deploy to Vercel

Deploy the Next.js frontend to Vercel. Requires connecting the GitHub repo and setting the frontend root directory.

**Files:**
- No code changes — platform configuration only

**Step 1: Push all changes to GitHub**

Run: `git push origin main`

**Step 2: Deploy to Vercel**

This is a manual step in the Vercel dashboard (or via `vercel` CLI):

1. Go to https://vercel.com/new
2. Import the `kevjaeg/PropertyFlow` GitHub repository
3. Set **Root Directory** to `frontend`
4. Set environment variable: `NEXT_PUBLIC_API_URL` = `https://propertyflow-api.onrender.com`
5. Deploy

Expected: Frontend builds and deploys to `propertyflow.vercel.app` (or similar auto-generated URL).

**Step 3: Note the deployed URL**

Save the actual Vercel URL — it's needed for Render's `FRONTEND_URL` env var.

---

### Task 7: Deploy backend + PostgreSQL to Render

Deploy the FastAPI backend and PostgreSQL database to Render using the `render.yaml` blueprint.

**Files:**
- No code changes — platform configuration only

**Step 1: Deploy via Render Blueprint**

1. Go to https://render.com/new
2. Select "Blueprint" and connect the `kevjaeg/PropertyFlow` GitHub repository
3. Render detects `render.yaml` and shows the services to create
4. Review the services (propertyflow-api web service + propertyflow-db PostgreSQL)
5. Click "Apply"

**Step 2: Update FRONTEND_URL if Vercel URL differs**

If the actual Vercel URL is different from `propertyflow.vercel.app`, update the `FRONTEND_URL` env var on the Render dashboard.

**Step 3: Verify deployment**

Run: `curl https://propertyflow-api.onrender.com/health`
Expected: `{"status":"ok"}`

**Step 4: Seed demo data on Render**

Use Render's shell or one-off job:
1. Go to the propertyflow-api service on Render dashboard
2. Open the Shell tab
3. Run: `python -m app.services.seed`
Expected: "Demo data created successfully!"

---

### Task 8: End-to-end verification

Test the full deployed application to ensure everything works.

**Steps:**

1. **Landing page:** Visit the Vercel URL — marketing page loads
2. **Signup:** Create a new account — API call succeeds
3. **Login:** Log in with the new account — JWT token returned
4. **Create agent:** Add a new agent — saved to PostgreSQL
5. **Create listing:** Add a new listing — slug generated
6. **Property page:** Visit `/p/{slug}` — branded page loads with listing data
7. **MLS page:** Visit `/p/{slug}/mls` — unbranded page loads
8. **Lead capture:** Submit the contact form on property page — lead saved
9. **Leads dashboard:** View leads in the dashboard — lead appears
10. **Demo login:** Log in as `demo@propertyflow.app` / `demo1234` — demo data visible

If any step fails, check:
- Render logs for backend errors
- Browser console for CORS errors (indicates `FRONTEND_URL` mismatch)
- Network tab for API URL (indicates `NEXT_PUBLIC_API_URL` not set)
