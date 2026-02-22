# PropertyFlow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a digital asset delivery platform where real estate photographers upload listing assets once and get branded + unbranded property website links.

**Architecture:** Next.js 14 frontend (App Router + Tailwind + shadcn/ui) talks to a FastAPI backend. PostgreSQL for data, Cloudflare Images for photos, Mux for video, Resend for email. JWT auth. Deployed on Vercel + Railway.

**Tech Stack:** Next.js 14, FastAPI, PostgreSQL, SQLAlchemy, Alembic, Cloudflare Images, Mux, Resend, Tailwind CSS, shadcn/ui

**Design Doc:** `docs/plans/2026-02-22-propertyflow-design.md`

---

## Stage 1: Foundation

### Task 1: Backend Project Setup

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/app/core/__init__.py`
- Create: `backend/app/core/config.py`
- Create: `backend/app/core/database.py`
- Create: `backend/.env.example`

**Step 1: Create backend directory and requirements**

```txt
# backend/requirements.txt
fastapi==0.115.0
uvicorn[standard]==0.30.6
sqlalchemy==2.0.35
alembic==1.13.2
psycopg2-binary==2.9.9
pydantic==2.9.2
pydantic-settings==2.5.2
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9
httpx==0.27.2
mux-python==5.3.0
resend==2.4.0
pytest==8.3.3
pytest-asyncio==0.24.0
```

**Step 2: Create config module**

```python
# backend/app/core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/propertyflow"
    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    CLOUDFLARE_ACCOUNT_ID: str = ""
    CLOUDFLARE_API_TOKEN: str = ""

    MUX_TOKEN_ID: str = ""
    MUX_TOKEN_SECRET: str = ""

    RESEND_API_KEY: str = ""

    FRONTEND_URL: str = "http://localhost:3000"

    model_config = {"env_file": ".env"}

settings = Settings()
```

**Step 3: Create database module**

```python
# backend/app/core/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
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

**Step 4: Create FastAPI app entry point**

```python
# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings

app = FastAPI(title="PropertyFlow API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}
```

**Step 5: Create .env.example**

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/propertyflow
SECRET_KEY=change-me-in-production
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
MUX_TOKEN_ID=
MUX_TOKEN_SECRET=
RESEND_API_KEY=
FRONTEND_URL=http://localhost:3000
```

**Step 6: Verify backend starts**

Run: `cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload`
Expected: Server running on http://127.0.0.1:8000, /health returns `{"status": "ok"}`

**Step 7: Commit**

```bash
git add backend/
git commit -m "feat: initialize FastAPI backend with config and database modules"
```

---

### Task 2: Database Models + Alembic Migrations

**Files:**
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/user.py`
- Create: `backend/app/models/agent.py`
- Create: `backend/app/models/listing.py`
- Create: `backend/app/models/photo.py`
- Create: `backend/app/models/video.py`
- Create: `backend/app/models/lead.py`
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`

**Step 1: Create all SQLAlchemy models**

```python
# backend/app/models/user.py
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Enum as SQLEnum, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    business_name: Mapped[str | None] = mapped_column(String(255))
    subscription_tier: Mapped[str] = mapped_column(String(20), default="free")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    agents = relationship("Agent", back_populates="photographer", cascade="all, delete-orphan")
    listings = relationship("Listing", back_populates="photographer", cascade="all, delete-orphan")
```

```python
# backend/app/models/agent.py
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    photographer_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(50))
    brokerage_name: Mapped[str | None] = mapped_column(String(255))
    photo_url: Mapped[str | None] = mapped_column(String(500))
    brokerage_logo_url: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    photographer = relationship("User", back_populates="agents")
    listings = relationship("Listing", back_populates="agent")
```

```python
# backend/app/models/listing.py
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Text, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class Listing(Base):
    __tablename__ = "listings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    photographer_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    agent_id: Mapped[str] = mapped_column(String(36), ForeignKey("agents.id"), nullable=False)
    slug: Mapped[str] = mapped_column(String(300), unique=True, nullable=False, index=True)
    address: Mapped[str] = mapped_column(String(500), nullable=False)
    price: Mapped[int] = mapped_column(Integer, nullable=False)  # cents
    beds: Mapped[int] = mapped_column(Integer, nullable=False)
    baths: Mapped[int] = mapped_column(Integer, nullable=False)
    sqft: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    mls_number: Mapped[str | None] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(20), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    photographer = relationship("User", back_populates="listings")
    agent = relationship("Agent", back_populates="listings")
    photos = relationship("ListingPhoto", back_populates="listing", cascade="all, delete-orphan", order_by="ListingPhoto.position")
    videos = relationship("ListingVideo", back_populates="listing", cascade="all, delete-orphan")
    leads = relationship("Lead", back_populates="listing", cascade="all, delete-orphan")
```

```python
# backend/app/models/photo.py
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class ListingPhoto(Base):
    __tablename__ = "listing_photos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    listing_id: Mapped[str] = mapped_column(String(36), ForeignKey("listings.id"), nullable=False)
    cloudflare_image_id: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    thumbnail_url: Mapped[str] = mapped_column(String(500), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    listing = relationship("Listing", back_populates="photos")
```

```python
# backend/app/models/video.py
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class ListingVideo(Base):
    __tablename__ = "listing_videos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    listing_id: Mapped[str] = mapped_column(String(36), ForeignKey("listings.id"), nullable=False)
    mux_asset_id: Mapped[str | None] = mapped_column(String(255))
    mux_playback_id: Mapped[str | None] = mapped_column(String(255))
    title: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(20), default="processing")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    listing = relationship("Listing", back_populates="videos")
```

```python
# backend/app/models/lead.py
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    listing_id: Mapped[str] = mapped_column(String(36), ForeignKey("listings.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50))
    message: Mapped[str | None] = mapped_column(Text)
    notified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    listing = relationship("Listing", back_populates="leads")
```

```python
# backend/app/models/__init__.py
from app.models.user import User
from app.models.agent import Agent
from app.models.listing import Listing
from app.models.photo import ListingPhoto
from app.models.video import ListingVideo
from app.models.lead import Lead

__all__ = ["User", "Agent", "Listing", "ListingPhoto", "ListingVideo", "Lead"]
```

**Step 2: Initialize Alembic and create initial migration**

Run: `cd backend && alembic init alembic`

Then edit `alembic/env.py` to import models and use `DATABASE_URL` from config.
Then edit `alembic.ini` to point sqlalchemy.url at config.

Run: `alembic revision --autogenerate -m "initial schema"`
Run: `alembic upgrade head`

Verify: All 6 tables created in PostgreSQL.

**Step 3: Commit**

```bash
git add backend/app/models/ backend/alembic/ backend/alembic.ini
git commit -m "feat: add database models and initial migration for all entities"
```

---

### Task 3: Auth System (Signup + Login + JWT)

**Files:**
- Create: `backend/app/core/auth.py`
- Create: `backend/app/schemas/__init__.py`
- Create: `backend/app/schemas/auth.py`
- Create: `backend/app/api/__init__.py`
- Create: `backend/app/api/auth.py`
- Modify: `backend/app/main.py` (register router)
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_auth.py`

**Step 1: Write failing tests for auth**

```python
# backend/tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, get_db

SQLALCHEMY_TEST_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_TEST_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def client(db):
    def override_get_db():
        yield db
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
```

```python
# backend/tests/test_auth.py
def test_signup_creates_user(client):
    response = client.post("/auth/signup", json={
        "email": "photographer@test.com",
        "password": "securepass123",
        "business_name": "Jane Photo Co"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "photographer@test.com"
    assert data["business_name"] == "Jane Photo Co"
    assert "id" in data
    assert "password_hash" not in data

def test_signup_duplicate_email_fails(client):
    client.post("/auth/signup", json={"email": "dup@test.com", "password": "pass123"})
    response = client.post("/auth/signup", json={"email": "dup@test.com", "password": "pass456"})
    assert response.status_code == 400

def test_login_returns_token(client):
    client.post("/auth/signup", json={"email": "login@test.com", "password": "pass123"})
    response = client.post("/auth/login", json={"email": "login@test.com", "password": "pass123"})
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_login_wrong_password_fails(client):
    client.post("/auth/signup", json={"email": "wrong@test.com", "password": "pass123"})
    response = client.post("/auth/login", json={"email": "wrong@test.com", "password": "wrongpass"})
    assert response.status_code == 401

def test_me_returns_current_user(client):
    client.post("/auth/signup", json={"email": "me@test.com", "password": "pass123"})
    login = client.post("/auth/login", json={"email": "me@test.com", "password": "pass123"})
    token = login.json()["access_token"]
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "me@test.com"
```

**Step 2: Run tests to verify they fail**

Run: `cd backend && pytest tests/test_auth.py -v`
Expected: All 5 tests FAIL

**Step 3: Implement auth module**

```python
# backend/app/core/auth.py
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": user_id, "exp": expire}, settings.SECRET_KEY, algorithm="HS256")

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = jwt.decode(credentials.credentials, settings.SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user
```

```python
# backend/app/schemas/auth.py
from pydantic import BaseModel, EmailStr

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    business_name: str | None = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: str
    email: str
    business_name: str | None
    subscription_tier: str

    model_config = {"from_attributes": True}
```

```python
# backend/app/api/auth.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import hash_password, verify_password, create_access_token, get_current_user
from app.models.user import User
from app.schemas.auth import SignupRequest, LoginRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=UserResponse, status_code=201)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(email=req.email, password_hash=hash_password(req.password), business_name=req.business_name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return TokenResponse(access_token=create_access_token(user.id))

@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    return user
```

Register router in `backend/app/main.py`:
```python
from app.api.auth import router as auth_router
app.include_router(auth_router)
```

**Step 4: Run tests to verify they pass**

Run: `cd backend && pytest tests/test_auth.py -v`
Expected: All 5 tests PASS

**Step 5: Commit**

```bash
git add backend/
git commit -m "feat: add auth system with signup, login, JWT, and tests"
```

---

### Task 4: Frontend Project Setup

**Files:**
- Create: `frontend/` (Next.js app via create-next-app)
- Create: `frontend/.env.local.example`

**Step 1: Initialize Next.js project**

Run: `cd /path/to/project && npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm`

**Step 2: Install dependencies**

Run: `cd frontend && npm install @mux/mux-player-react lucide-react class-variance-authority clsx tailwind-merge`

**Step 3: Initialize shadcn/ui**

Run: `cd frontend && npx shadcn@latest init`

Select: New York style, Zinc color, CSS variables yes.

Then install core components:
Run: `npx shadcn@latest add button input label card dialog dropdown-menu form toast separator avatar badge`

**Step 4: Create env example**

```
# frontend/.env.local.example
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Step 5: Verify frontend starts**

Run: `cd frontend && npm run dev`
Expected: App running on http://localhost:3000

**Step 6: Commit**

```bash
git add frontend/
echo "node_modules" >> .gitignore
git commit -m "feat: initialize Next.js frontend with Tailwind and shadcn/ui"
```

---

### Task 5: Frontend Auth (Login + Signup Pages)

**Files:**
- Create: `frontend/lib/api.ts` (API client)
- Create: `frontend/lib/auth.ts` (auth context)
- Create: `frontend/app/(auth)/login/page.tsx`
- Create: `frontend/app/(auth)/signup/page.tsx`
- Create: `frontend/app/(auth)/layout.tsx`

**Step 1: Create API client**

```typescript
// frontend/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }

  getToken(): string | null {
    if (!this.token && typeof window !== "undefined") {
      this.token = localStorage.getItem("token");
    }
    return this.token;
  }

  async fetch(path: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };
    const token = this.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}${path}`, { ...options, headers });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "Request failed" }));
      throw new Error(error.detail || "Request failed");
    }
    return res.json();
  }

  post(path: string, body: unknown) {
    return this.fetch(path, { method: "POST", body: JSON.stringify(body) });
  }
  put(path: string, body: unknown) {
    return this.fetch(path, { method: "PUT", body: JSON.stringify(body) });
  }
  patch(path: string, body: unknown) {
    return this.fetch(path, { method: "PATCH", body: JSON.stringify(body) });
  }
  delete(path: string) {
    return this.fetch(path, { method: "DELETE" });
  }
}

export const api = new ApiClient();
```

**Step 2: Create auth context with React Context**

```typescript
// frontend/lib/auth.tsx
"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "./api";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  business_name: string | null;
  subscription_tier: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, businessName?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      api.fetch("/auth/me")
        .then(setUser)
        .catch(() => { api.setToken(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const { access_token } = await api.post("/auth/login", { email, password });
    api.setToken(access_token);
    const me = await api.fetch("/auth/me");
    setUser(me);
    router.push("/dashboard");
  };

  const signup = async (email: string, password: string, businessName?: string) => {
    await api.post("/auth/signup", { email, password, business_name: businessName });
    await login(email, password);
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
```

**Step 3: Build login and signup pages**

Build clean, professional login/signup forms using shadcn/ui Card, Input, Button components. Centered layout, minimal design. Both forms use the auth context methods.

**Step 4: Verify auth flow works end-to-end**

- Start backend: `cd backend && uvicorn app.main:app --reload`
- Start frontend: `cd frontend && npm run dev`
- Sign up → auto-redirects to /dashboard
- Log out → redirects to /login
- Log in with same credentials → back to /dashboard

**Step 5: Commit**

```bash
git add frontend/
git commit -m "feat: add auth pages and API client with JWT token management"
```

---

### Task 6: Dashboard Layout Shell

**Files:**
- Create: `frontend/app/(dashboard)/layout.tsx`
- Create: `frontend/app/(dashboard)/dashboard/page.tsx`
- Create: `frontend/components/sidebar.tsx`

**Step 1: Build dashboard layout with sidebar**

Sidebar navigation with links to: Dashboard, Agents, Listings, Leads.
Header with business name + logout button.
Main content area that renders child routes.
Responsive: sidebar collapses to top nav on mobile.

**Step 2: Build dashboard home page**

Simple overview: "Welcome, [business_name]" + quick stats placeholders (active listings count, total leads, agent count). These will be populated later — just the UI shell for now.

**Step 3: Verify navigation works**

All sidebar links navigate correctly. Dashboard shows welcome message.

**Step 4: Commit**

```bash
git add frontend/
git commit -m "feat: add dashboard layout with sidebar navigation"
```

---

## Stage 2: Agent Management

### Task 7: Agent CRUD API

**Files:**
- Create: `backend/app/schemas/agent.py`
- Create: `backend/app/api/agents.py`
- Modify: `backend/app/main.py` (register router)
- Create: `backend/tests/test_agents.py`

**Step 1: Write failing tests**

```python
# backend/tests/test_agents.py
def auth_headers(client):
    client.post("/auth/signup", json={"email": "photo@test.com", "password": "pass123"})
    login = client.post("/auth/login", json={"email": "photo@test.com", "password": "pass123"})
    return {"Authorization": f"Bearer {login.json()['access_token']}"}

def test_create_agent(client):
    headers = auth_headers(client)
    response = client.post("/agents", json={
        "name": "Jane Smith",
        "email": "jane@realty.com",
        "phone": "512-555-1234",
        "brokerage_name": "Keller Williams"
    }, headers=headers)
    assert response.status_code == 201
    assert response.json()["name"] == "Jane Smith"

def test_list_agents(client):
    headers = auth_headers(client)
    client.post("/agents", json={"name": "Agent 1"}, headers=headers)
    client.post("/agents", json={"name": "Agent 2"}, headers=headers)
    response = client.get("/agents", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) == 2

def test_update_agent(client):
    headers = auth_headers(client)
    created = client.post("/agents", json={"name": "Old Name"}, headers=headers)
    agent_id = created.json()["id"]
    response = client.put(f"/agents/{agent_id}", json={"name": "New Name"}, headers=headers)
    assert response.status_code == 200
    assert response.json()["name"] == "New Name"

def test_delete_agent(client):
    headers = auth_headers(client)
    created = client.post("/agents", json={"name": "To Delete"}, headers=headers)
    agent_id = created.json()["id"]
    response = client.delete(f"/agents/{agent_id}", headers=headers)
    assert response.status_code == 204
```

**Step 2: Run tests to verify they fail**

Run: `pytest tests/test_agents.py -v`

**Step 3: Implement agent schemas and router**

Standard CRUD: create, list, update, delete. All scoped to current photographer via `get_current_user` dependency. Return 404 if agent doesn't belong to user.

**Step 4: Run tests to verify they pass**

**Step 5: Commit**

```bash
git commit -m "feat: add agent CRUD API with tests"
```

---

### Task 8: Agent Management Frontend

**Files:**
- Create: `frontend/app/(dashboard)/agents/page.tsx` (agent list)
- Create: `frontend/app/(dashboard)/agents/new/page.tsx` (create form)
- Create: `frontend/app/(dashboard)/agents/[id]/edit/page.tsx` (edit form)
- Create: `frontend/components/agent-form.tsx` (shared form component)

**Step 1: Build agent list page**

Table/card list showing all agents. Each row: name, brokerage, phone, email, edit/delete actions. "Add Agent" button in top right. Empty state: "No agents yet. Add your first agent to start creating listings."

**Step 2: Build agent create/edit form**

Shared form component with fields: name, email, phone, brokerage_name. Photo upload and brokerage logo upload (Cloudflare Images integration — placeholder for now, file input that we'll wire to Cloudflare in Task 10).

**Step 3: Verify full CRUD flow in browser**

Create agent → appears in list → edit agent → changes saved → delete agent → removed from list.

**Step 4: Commit**

```bash
git commit -m "feat: add agent management UI (list, create, edit, delete)"
```

---

## Stage 3: Listing Builder

### Task 9: Listing CRUD API

**Files:**
- Create: `backend/app/schemas/listing.py`
- Create: `backend/app/api/listings.py`
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/slug.py`
- Create: `backend/tests/test_listings.py`
- Create: `backend/tests/test_slug.py`

**Step 1: Write failing tests for slug generation**

```python
# backend/tests/test_slug.py
from app.services.slug import generate_slug

def test_basic_slug():
    assert generate_slug("123 Main Street, Austin TX") == "123-main-street-austin-tx"

def test_strips_special_chars():
    assert generate_slug("456 Oak Ave. #2B, Dallas TX") == "456-oak-ave-2b-dallas-tx"

def test_lowercases():
    assert generate_slug("789 ELM BLVD") == "789-elm-blvd"
```

**Step 2: Implement slug service**

```python
# backend/app/services/slug.py
import re
from sqlalchemy.orm import Session
from app.models.listing import Listing

def generate_slug(address: str) -> str:
    slug = address.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s-]+", "-", slug)
    slug = slug.strip("-")
    return slug

def get_unique_slug(address: str, db: Session) -> str:
    base = generate_slug(address)
    slug = base
    counter = 2
    while db.query(Listing).filter(Listing.slug == slug).first():
        slug = f"{base}-{counter}"
        counter += 1
    return slug
```

**Step 3: Write failing tests for listing CRUD**

Test create (with free tier limit enforcement — max 5 active), list, update, archive/activate, delete.

**Step 4: Implement listing schemas and router**

Key logic: on create, check `count(active listings for user) < 5` if free tier. Auto-generate slug from address. Return both branded and unbranded URLs in response.

**Step 5: Run all tests**

Run: `pytest tests/ -v`

**Step 6: Commit**

```bash
git commit -m "feat: add listing CRUD API with slug generation and free tier limit"
```

---

### Task 10: Cloudflare Images Integration

**Files:**
- Create: `backend/app/services/cloudflare.py`
- Modify: `backend/app/api/agents.py` (add photo upload endpoint)
- Create: `backend/app/api/photos.py`
- Create: `backend/tests/test_photos.py`

**Step 1: Implement Cloudflare Images service**

```python
# backend/app/services/cloudflare.py
import httpx
from app.core.config import settings

CLOUDFLARE_BASE = f"https://api.cloudflare.com/client/v4/accounts/{settings.CLOUDFLARE_ACCOUNT_ID}/images/v1"

async def upload_image(file_bytes: bytes, filename: str) -> dict:
    """Upload image to Cloudflare Images, returns {id, url, thumbnail_url}"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            CLOUDFLARE_BASE,
            headers={"Authorization": f"Bearer {settings.CLOUDFLARE_API_TOKEN}"},
            files={"file": (filename, file_bytes)},
        )
        response.raise_for_status()
        result = response.json()["result"]
        image_id = result["id"]
        # Cloudflare Images delivers variants
        base_url = result["variants"][0].rsplit("/", 1)[0]
        return {
            "id": image_id,
            "url": f"{base_url}/public",
            "thumbnail_url": f"{base_url}/thumbnail",
        }

async def delete_image(image_id: str):
    async with httpx.AsyncClient() as client:
        await client.delete(
            f"{CLOUDFLARE_BASE}/{image_id}",
            headers={"Authorization": f"Bearer {settings.CLOUDFLARE_API_TOKEN}"},
        )
```

**Step 2: Add photo upload + reorder + delete endpoints**

`POST /listings/{id}/photos` — accepts multipart file upload, uploads to Cloudflare, stores record with position.
`PUT /listings/{id}/photos/order` — accepts `{photo_ids: ["id1", "id2", ...]}`, updates position values.
`DELETE /listings/{id}/photos/{photo_id}` — deletes from Cloudflare + DB.

**Step 3: Add agent photo/logo upload**

`POST /agents/{id}/photo` — uploads agent headshot
`POST /agents/{id}/logo` — uploads brokerage logo

**Step 4: Write tests (mock Cloudflare API)**

**Step 5: Commit**

```bash
git commit -m "feat: add Cloudflare Images integration for photo and agent image uploads"
```

---

### Task 11: Mux Video Integration

**Files:**
- Create: `backend/app/services/mux.py`
- Create: `backend/app/api/videos.py`
- Create: `backend/app/api/webhooks.py`
- Create: `backend/tests/test_videos.py`

**Step 1: Implement Mux service**

```python
# backend/app/services/mux.py
import mux_python
from app.core.config import settings

configuration = mux_python.Configuration()
configuration.username = settings.MUX_TOKEN_ID
configuration.password = settings.MUX_TOKEN_SECRET

def create_direct_upload() -> dict:
    """Create Mux direct upload URL. Returns {upload_id, upload_url}"""
    uploads_api = mux_python.DirectUploadsApi(mux_python.ApiClient(configuration))
    request = mux_python.CreateUploadRequest(
        new_asset_settings=mux_python.CreateAssetRequest(
            playback_policy=[mux_python.PlaybackPolicy.PUBLIC],
        ),
        cors_origin=settings.FRONTEND_URL,
    )
    upload = uploads_api.create_direct_upload(request)
    return {"upload_id": upload.data.id, "upload_url": upload.data.url}

def get_asset(asset_id: str) -> dict:
    """Get asset details including playback_id"""
    assets_api = mux_python.AssetsApi(mux_python.ApiClient(configuration))
    asset = assets_api.get_asset(asset_id)
    playback_id = asset.data.playback_ids[0].id if asset.data.playback_ids else None
    return {"asset_id": asset.data.id, "playback_id": playback_id, "status": asset.data.status}
```

**Step 2: Add video endpoints**

`POST /listings/{id}/videos` — creates Mux direct upload, returns URL for frontend to upload to.
`GET /listings/{id}/videos/{vid}/status` — checks processing status.

**Step 3: Add Mux webhook handler**

`POST /webhooks/mux` — receives `video.asset.ready` event, updates ListingVideo status to "ready" with playback_id.

**Step 4: Write tests (mock Mux API)**

**Step 5: Commit**

```bash
git commit -m "feat: add Mux video upload, processing status, and webhook handler"
```

---

### Task 12: Listing Builder Frontend

**Files:**
- Create: `frontend/app/(dashboard)/listings/page.tsx`
- Create: `frontend/app/(dashboard)/listings/new/page.tsx`
- Create: `frontend/app/(dashboard)/listings/[id]/edit/page.tsx`
- Create: `frontend/components/listing-form.tsx`
- Create: `frontend/components/photo-uploader.tsx`
- Create: `frontend/components/photo-grid-sortable.tsx`
- Create: `frontend/components/video-uploader.tsx`

**Step 1: Install drag-and-drop library**

Run: `cd frontend && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

**Step 2: Build listing list page**

Card grid showing all listings. Each card: hero thumbnail, address, price, status badge (active/archived), agent name. Status toggle (archive/activate). "New Listing" button. Filter: active vs archived.

**Step 3: Build listing creation form**

Multi-step or single-page form:
1. Property details (address, price, beds/baths/sqft, description, MLS#)
2. Select agent from dropdown (populated from /agents)
3. Photo upload area (drag-drop zone, shows thumbnails, drag to reorder via dnd-kit)
4. Video upload area (upload button, shows processing status)
5. Preview of generated URLs (slug auto-generated from address)
6. "Create Listing" button

**Step 4: Build photo uploader with drag-and-drop reorder**

The `photo-grid-sortable.tsx` component:
- Shows uploaded photo thumbnails in a grid
- Drag-and-drop to reorder (dnd-kit sortable)
- X button on each photo to delete
- First photo has "Hero" badge
- Upload zone at the end accepts multiple files

**Step 5: Build video uploader**

- Upload button → gets Mux direct upload URL from backend → uploads directly to Mux
- Shows processing spinner while Mux processes
- Shows video thumbnail when ready

**Step 6: Verify full listing creation flow**

Create listing → upload photos → reorder them → upload video → listing appears in list with correct URLs.

**Step 7: Commit**

```bash
git commit -m "feat: add listing builder with photo drag-and-drop and Mux video upload"
```

---

## Stage 4: Property Pages (THE CORE)

### Task 13: Public Listing API

**Files:**
- Create: `backend/app/api/public.py`
- Create: `backend/app/schemas/public.py`
- Create: `backend/tests/test_public.py`

**Step 1: Write failing tests**

```python
# backend/tests/test_public.py
def test_branded_listing_includes_agent(client, db):
    # Create user, agent, listing via helpers
    response = client.get(f"/p/{slug}")
    assert response.status_code == 200
    data = response.json()
    assert "agent" in data
    assert data["agent"]["name"] == "Jane Smith"
    assert "photos" in data
    assert "videos" in data

def test_unbranded_listing_excludes_agent(client, db):
    response = client.get(f"/p/{slug}/mls")
    assert response.status_code == 200
    data = response.json()
    assert "agent" not in data

def test_nonexistent_slug_returns_404(client):
    response = client.get("/p/nonexistent-slug")
    assert response.status_code == 404

def test_archived_listing_returns_404(client, db):
    # Create listing then archive it
    response = client.get(f"/p/{slug}")
    assert response.status_code == 404
```

**Step 2: Implement public listing endpoints**

`GET /p/{slug}` — returns full listing data with agent info, photos (ordered), videos.
`GET /p/{slug}/mls` — same query but agent fields omitted from response.
Both return 404 for archived or nonexistent listings. No auth required.

**Step 3: Run tests**

**Step 4: Commit**

```bash
git commit -m "feat: add public listing API endpoints (branded and unbranded)"
```

---

### Task 14: Branded Property Page

**Files:**
- Create: `frontend/app/p/[slug]/page.tsx`
- Create: `frontend/app/p/[slug]/layout.tsx`
- Create: `frontend/components/property/hero-image.tsx`
- Create: `frontend/components/property/property-header.tsx`
- Create: `frontend/components/property/photo-grid.tsx`
- Create: `frontend/components/property/photo-lightbox.tsx`
- Create: `frontend/components/property/video-section.tsx`
- Create: `frontend/components/property/agent-card.tsx`
- Create: `frontend/components/property/lead-form.tsx`
- Create: `frontend/components/property/powered-by-footer.tsx`

**Step 1: Create page layout and data fetching**

Server component that fetches listing data from `/p/{slug}` API. Generates OG meta tags (title = address, description = price + beds/baths, image = hero photo URL). Returns 404 page for missing listings.

```typescript
// frontend/app/p/[slug]/page.tsx
import { Metadata } from "next";
// Fetch listing data server-side
// Generate metadata for social sharing
// Render property page components
```

**Step 2: Build hero image component**

Full-width image container, aspect-ratio preserved, ~60vh max-height on desktop. Uses Cloudflare Images responsive variants. Lazy loading NOT applied to hero (it's above the fold).

**Step 3: Build property header**

Address in large bold text. Below: price (formatted as $XXX,XXX) · X bd · X ba · X,XXX sqft. Clean, simple line.

**Step 4: Build photo grid + lightbox**

Grid: 2 columns on mobile, 3 columns on desktop. Gap of 4-8px. Thumbnails from Cloudflare Images. On click: open full-screen lightbox overlay with:
- Dark backdrop
- Full-size image centered
- Left/right arrow buttons
- Close X button
- Keyboard: arrow keys navigate, Escape closes
- Mobile: swipe left/right
- Photo counter "3 / 25"

**Step 5: Build video section**

Uses `@mux/mux-player-react` component. Poster image from Mux thumbnail. No autoplay. Shows for each video in listing. Section hidden if no videos.

**Step 6: Build agent card**

Agent photo (circular), name, brokerage name, phone (clickable tel: link), email (clickable mailto: link). Clean card design with subtle border/shadow.

**Step 7: Build lead capture form (placeholder — wired in Task 15)**

Form fields: name, email, phone, message. Submit button. Will be connected to API in Stage 5.

**Step 8: Build "Powered by PropertyFlow" footer**

Small, tasteful footer. Text: "Powered by PropertyFlow" with external link icon. Links to marketing landing page (root domain).

**Step 9: Mobile responsiveness pass**

Test all components at 375px, 768px, 1024px, 1440px widths. Ensure nothing breaks, images scale properly, lightbox works on touch.

**Step 10: Commit**

```bash
git commit -m "feat: build branded property page with gallery, lightbox, video, agent card"
```

---

### Task 15: Unbranded (MLS) Property Page

**Files:**
- Create: `frontend/app/p/[slug]/mls/page.tsx`

**Step 1: Build unbranded page**

Reuses all property page components EXCEPT agent-card and lead-form. Fetches from `/p/{slug}/mls` endpoint (which excludes agent data).

The page structure:
1. Hero image
2. Property header
3. Photo grid + lightbox
4. Video section
5. Description
6. "Powered by PropertyFlow" footer

Same OG meta tags but without agent name in description.

**Step 2: Verify both versions side by side**

Open branded and unbranded URLs in two tabs. Confirm identical layout except agent card and contact form are missing from unbranded.

**Step 3: Commit**

```bash
git commit -m "feat: add unbranded MLS property page (same layout, no agent info)"
```

---

## Stage 5: Lead Capture

### Task 16: Lead Capture API + Email

**Files:**
- Create: `backend/app/services/email.py`
- Create: `backend/app/schemas/lead.py`
- Create: `backend/app/api/leads.py`
- Modify: `backend/app/api/public.py` (add lead submission endpoint)
- Create: `backend/tests/test_leads.py`

**Step 1: Write failing tests**

```python
def test_submit_lead(client, db):
    # Create listing via helpers
    response = client.post(f"/p/{slug}/leads", json={
        "name": "John Buyer",
        "email": "john@email.com",
        "phone": "555-0123",
        "message": "I'd like to schedule a showing"
    })
    assert response.status_code == 201

def test_lead_on_unbranded_returns_404(client, db):
    response = client.post(f"/p/{slug}/mls/leads", json={...})
    assert response.status_code == 404

def test_list_leads_as_photographer(client, db):
    # Submit some leads, then fetch as photographer
    response = client.get("/leads", headers=auth_headers)
    assert len(response.json()) > 0
```

**Step 2: Implement email service**

```python
# backend/app/services/email.py
import resend
from app.core.config import settings

resend.api_key = settings.RESEND_API_KEY

def send_lead_notification(agent_email: str, agent_name: str, lead_name: str,
                           lead_email: str, lead_phone: str | None,
                           message: str | None, listing_address: str):
    resend.Emails.send({
        "from": "PropertyFlow <notifications@propertyflow.app>",
        "to": agent_email,
        "subject": f"New Lead for {listing_address}",
        "html": f"""
            <h2>New inquiry for {listing_address}</h2>
            <p><strong>{lead_name}</strong> is interested in this property.</p>
            <p>Email: {lead_email}</p>
            {"<p>Phone: " + lead_phone + "</p>" if lead_phone else ""}
            {"<p>Message: " + message + "</p>" if message else ""}
            <hr>
            <p style="color:#666;font-size:12px">Sent via PropertyFlow</p>
        """
    })
```

**Step 3: Implement lead submission + listing endpoints**

**Step 4: Run tests**

**Step 5: Commit**

```bash
git commit -m "feat: add lead capture API with email notification via Resend"
```

---

### Task 17: Wire Lead Form + Leads Dashboard

**Files:**
- Modify: `frontend/components/property/lead-form.tsx` (connect to API)
- Create: `frontend/app/(dashboard)/leads/page.tsx`

**Step 1: Connect lead form to API**

Form submits to `/p/{slug}/leads`. Show success toast on submission. Reset form after submit. Basic validation (name + email required).

**Step 2: Build leads dashboard page**

Table showing all leads across all listings. Columns: date, name, email, phone, listing address. Sortable by date (newest first). Click listing address to go to listing. Empty state message.

**Step 3: Verify end-to-end lead flow**

Submit form on branded page → lead appears in dashboard → email sent to agent (check Resend dashboard).

**Step 4: Commit**

```bash
git commit -m "feat: wire lead capture form and add leads dashboard"
```

---

## Stage 6: Business Logic + Growth

### Task 18: Free Tier Enforcement + Listing Status

**Files:**
- Modify: `backend/app/api/listings.py` (enforce limits)
- Modify: `frontend/app/(dashboard)/listings/page.tsx` (status toggle, upgrade prompt)
- Create: `frontend/components/upgrade-prompt.tsx`

**Step 1: Backend enforcement**

On listing create: if `user.subscription_tier == "free"` and `count(active listings) >= 5`, return 403 with message "Free tier limit reached. Upgrade to create more listings."

On listing activate (from archived): same check.

**Step 2: Frontend enforcement**

- Show active listing count as "3/5 active" badge
- When at limit: "New Listing" button shows upgrade modal instead of create form
- Archive/Activate toggle on each listing card

**Step 3: Write tests for tier limits**

**Step 4: Commit**

```bash
git commit -m "feat: add free tier enforcement (5 active listing limit) with upgrade prompt"
```

---

### Task 19: Landing Page

**Files:**
- Create: `frontend/app/(marketing)/page.tsx`
- Create: `frontend/app/(marketing)/layout.tsx`
- Create: `frontend/components/marketing/hero-section.tsx`
- Create: `frontend/components/marketing/features-section.tsx`
- Create: `frontend/components/marketing/cta-section.tsx`

**Step 1: Build marketing landing page**

This is the page visitors see when clicking "Powered by PropertyFlow" on any property site. It needs to convert photographers to sign up.

Sections:
1. **Hero**: Headline ("Deliver stunning property websites in minutes"), subtext, "Get Started Free" CTA button, screenshot/mockup of a property page
2. **Features**: 3-4 feature cards (Two Links One Upload, Lead Capture, Agent Management, Mobile-First)
3. **How It Works**: 3 steps (Upload → Customize → Share)
4. **CTA**: "Start delivering professional listings today" + signup button

Clean, professional design. No stock photos — use CSS gradients and clean typography.

**Step 2: Commit**

```bash
git commit -m "feat: add marketing landing page with hero, features, and CTA"
```

---

## Stage 7: Polish

### Task 20: Loading States + Error Handling + Empty States

**Files:**
- Modify: all dashboard pages (add loading skeletons, error boundaries, empty states)
- Create: `frontend/components/loading-skeleton.tsx`
- Create: `frontend/app/not-found.tsx`
- Create: `frontend/app/error.tsx`

**Step 1: Add loading states**

Skeleton loading components for: agent list, listing grid, leads table. Show while data is fetching.

**Step 2: Add empty states**

Custom empty state messages for each page:
- No agents: "Add your first agent to start creating listings"
- No listings: "Create your first listing to generate property links"
- No leads: "Leads will appear here when visitors fill out contact forms"

**Step 3: Add error handling**

Global error boundary. 404 page for missing routes. API error toasts via shadcn toast component.

**Step 4: Commit**

```bash
git commit -m "feat: add loading states, empty states, and error handling"
```

---

### Task 21: Performance Optimization

**Files:**
- Modify: `frontend/app/p/[slug]/page.tsx` (image optimization)
- Modify: `frontend/next.config.js` (image domains)
- Modify: property page components (lazy loading)

**Step 1: Image optimization**

- Configure Next.js to allow Cloudflare Images domain
- Use `next/image` for hero image (priority loading)
- Photo grid thumbnails: use Cloudflare thumbnail variant (smaller size)
- Lightbox: load full-size image only when opened
- All images below fold: lazy loading via `loading="lazy"`

**Step 2: Run Lighthouse audit**

Run: Open Chrome DevTools → Lighthouse → Mobile → Performance
Target: 90+ performance score on property page

**Step 3: Fix any performance issues found**

**Step 4: Commit**

```bash
git commit -m "perf: optimize image loading and property page performance"
```

---

### Task 22: Demo Listing + Final Testing

**Files:**
- Create: `backend/app/services/seed.py` (demo data seeder)

**Step 1: Create seed script**

Script that creates: 1 demo photographer account, 1 demo agent, 1 listing with placeholder photo URLs and property details. Used for demos and showing the product to prospective users.

**Step 2: Cross-device testing**

Test on: iPhone Safari (via DevTools), Android Chrome (via DevTools), Desktop Chrome, Desktop Firefox. Verify: property pages, lightbox, video player, lead form, dashboard.

**Step 3: Final QA pass**

Walk through entire user flow:
1. Sign up → dashboard
2. Create agent with photo
3. Create listing with photos + video
4. View branded page (beautiful, fast, responsive)
5. View unbranded page (agent info gone, same quality)
6. Submit lead on branded page
7. Check leads in dashboard
8. Archive listing → URL returns 404
9. Reactivate → URL works again
10. "Powered by" footer links to landing page

**Step 4: Commit**

```bash
git commit -m "feat: add demo seed script and complete final QA pass"
```

---

## Summary

| Stage | Tasks | What's Built |
|-------|-------|-------------|
| 1: Foundation | Tasks 1-6 | Backend + frontend setup, auth, dashboard shell |
| 2: Agent Management | Tasks 7-8 | Agent CRUD (API + UI) |
| 3: Listing Builder | Tasks 9-12 | Listing CRUD, Cloudflare photos, Mux video |
| 4: Property Pages | Tasks 13-15 | Branded + unbranded property websites |
| 5: Lead Capture | Tasks 16-17 | Contact form, email notification, leads dashboard |
| 6: Business Logic | Tasks 18-19 | Free tier limits, landing page |
| 7: Polish | Tasks 20-22 | Loading states, performance, demo data, QA |

**Total: 22 tasks across 7 stages.**

Each task builds on the previous. Each produces a visible, testable result. Each ends with a commit.
