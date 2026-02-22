# PropertyFlow — MVP Design Document

**Date:** 2026-02-22
**Status:** Approved

## Overview

PropertyFlow is a digital asset delivery platform for real estate photographers. Photographers upload photos, videos, and property details once. The system generates two links per listing:

- **Branded** (`/p/{slug}`) — includes agent name, photo, contact info, brokerage logo, and a lead capture form
- **Unbranded** (`/p/{slug}/mls`) — identical layout with all agent identification and contact forms removed, for MLS compliance

The photographer is the paying customer. Agents receive links but never log in.

## User Flow

1. Photographer signs up (email/password)
2. Adds agent profiles (name, photo, contact info, brokerage)
3. Creates a listing:
   - Enters property details (address, price, beds/baths/sqft, description, MLS#)
   - Uploads up to 50 photos with drag-and-drop ordering
   - Uploads 1-2 videos via Mux
   - Selects an agent from saved profiles
4. System generates branded + unbranded URLs
5. Photographer sends both links to the agent
6. Agent uses branded link for social media/marketing, unbranded link for MLS submission

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js 14 (App Router) + Tailwind CSS + shadcn/ui | SSR for fast property pages, SEO, OG tags |
| Backend | FastAPI + SQLAlchemy + Alembic + Pydantic | Python preference, auto-docs, type safety |
| Database | PostgreSQL (Railway) | Concurrent-safe, free tier on Railway |
| Images | Cloudflare Images | Auto WebP, responsive sizing, global CDN |
| Video | Mux | Adaptive streaming, no third-party branding, direct upload |
| Email | Resend | Lead notification emails to agents |
| Auth | JWT (email/password) | Simple, stateless, sufficient for MVP |
| Deploy | Vercel (frontend) + Railway (backend + DB) | Cost-effective, generous free tiers |

## Project Structure

```
Digital-Asset-Delivery/
├── frontend/                   # Next.js app
│   ├── app/
│   │   ├── (marketing)/        # Landing page at root
│   │   ├── (dashboard)/        # Photographer dashboard
│   │   │   ├── dashboard/
│   │   │   ├── agents/
│   │   │   ├── listings/
│   │   │   └── leads/
│   │   └── p/[slug]/           # Public property pages
│   │       ├── page.tsx        # Branded version
│   │       └── mls/page.tsx    # Unbranded version
│   ├── components/
│   └── lib/
├── backend/                    # FastAPI app
│   ├── app/
│   │   ├── api/                # Route handlers
│   │   ├── models/             # SQLAlchemy models
│   │   ├── schemas/            # Pydantic schemas
│   │   ├── services/           # Business logic
│   │   └── core/               # Config, auth, deps
│   └── alembic/                # DB migrations
└── docs/
    └── plans/
```

## Data Model

### Photographer (User)
- id (UUID, PK)
- email (unique)
- password_hash
- business_name (optional)
- subscription_tier (enum: free, pro)
- created_at, updated_at

### Agent
- id (UUID, PK)
- photographer_id (FK → Photographer)
- name
- email
- phone
- brokerage_name
- photo_url (Cloudflare Images)
- brokerage_logo_url (Cloudflare Images)
- created_at, updated_at

### Listing
- id (UUID, PK)
- photographer_id (FK → Photographer)
- agent_id (FK → Agent)
- slug (unique, globally)
- address
- price (integer, cents)
- beds, baths (integer), sqft (integer)
- description (text)
- mls_number (string, optional)
- status (enum: active, archived)
- created_at, updated_at

### ListingPhoto
- id (UUID, PK)
- listing_id (FK → Listing)
- cloudflare_image_id
- url
- thumbnail_url
- position (integer, for ordering)
- created_at

### ListingVideo
- id (UUID, PK)
- listing_id (FK → Listing)
- mux_asset_id
- mux_playback_id
- title (optional)
- status (enum: processing, ready, error)
- created_at

### Lead
- id (UUID, PK)
- listing_id (FK → Listing)
- name
- email
- phone (optional)
- message (text)
- notified (boolean, default false)
- created_at

## API Endpoints

### Auth
- `POST /auth/signup` — create account
- `POST /auth/login` — get JWT token
- `GET /auth/me` — current user profile

### Agents
- `GET /agents` — list photographer's agents
- `POST /agents` — create agent
- `PUT /agents/{id}` — update agent
- `DELETE /agents/{id}` — delete agent

### Listings
- `GET /listings` — list photographer's listings
- `POST /listings` — create listing
- `PUT /listings/{id}` — update listing
- `DELETE /listings/{id}` — delete listing
- `PATCH /listings/{id}/status` — activate/archive

### Photos
- `POST /listings/{id}/photos` — upload photo(s)
- `PUT /listings/{id}/photos/order` — reorder photos
- `DELETE /listings/{id}/photos/{photo_id}` — delete photo

### Videos
- `POST /listings/{id}/videos` — get Mux direct upload URL
- `GET /listings/{id}/videos/{video_id}/status` — check processing status

### Public
- `GET /p/{slug}` — listing data for branded page
- `GET /p/{slug}/mls` — listing data for unbranded page (no agent info)
- `POST /p/{slug}/leads` — submit lead capture form

### Leads
- `GET /leads` — photographer's leads (all listings)

## Property Page Layout

Mobile-first, single-page scrollable design:

1. **Hero image** — full-width, first photo, ~60vh
2. **Property header** — address (large), price + beds/baths/sqft (one line)
3. **Photo grid** — 2 columns mobile, 3 columns desktop. Click → full-screen lightbox with prev/next navigation
4. **Video section** — Mux player, click to play (no autoplay), 1-2 videos
5. **Description** — property description text + MLS number
6. **Agent card** — (BRANDED ONLY) agent photo, name, brokerage, phone, email
7. **Lead capture form** — (BRANDED ONLY) name, email, phone, message, submit button
8. **Footer** — "Powered by PropertyFlow" link (both versions)

Design principles:
- Neutral colors (white bg, dark text, subtle grays) — photos are the star
- Clean sans-serif typography (Inter or system fonts)
- Max-width 1200px on desktop, centered
- Lazy loading for all images below the fold
- Responsive srcsets via Cloudflare Images

## Business Logic

### Free Tier
- 5 active listings simultaneously
- Unlimited archived listings
- Unlimited agent profiles
- All core features included (branded/unbranded, lead capture, video)

### Slug Generation
- Auto-generated from address: "123 Main Street, Austin TX" → `123-main-street-austin-tx`
- Globally unique (not scoped to photographer)
- On collision: append `-2`, `-3`, etc.

### Video Upload Flow
1. Frontend requests direct upload URL from backend
2. Backend creates Mux upload via API, returns upload URL
3. Frontend uploads video directly to Mux (video never touches our servers)
4. Mux processes video, sends webhook to backend
5. Backend updates video status to "ready"
6. Property page shows player when ready, processing indicator otherwise

### Lead Capture Flow
1. Visitor fills out form on branded property page
2. Frontend POSTs to `/p/{slug}/leads`
3. Backend stores lead, sends email to agent via Resend
4. Photographer sees lead in dashboard

## External Services Required

| Service | Purpose | Cost (MVP) |
|---------|---------|------------|
| Cloudflare Images | Photo hosting + CDN + optimization | ~$5/month |
| Mux | Video hosting + streaming | Pay-per-use (~$1-5/month at low volume) |
| Resend | Transactional email (lead notifications) | Free tier (100/day) |
| Railway | PostgreSQL + FastAPI hosting | ~$5-10/month |
| Vercel | Next.js hosting | Free tier |
| Domain | propertyflow.app or .io | ~$10/year |

**Total estimated cost: ~$15-25/month**

## Out of Scope (V2+)

- Marketing kit / social media flyer generation
- Analytics dashboard (views, leads per listing)
- Custom domains for photographers
- Slideshow / virtual tour builder
- Team/multi-user accounts
- MLS data import
- Image editing
- OAuth / social login
- Agent accounts / login
