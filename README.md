# AURA — AI Personal Style OS

> Your wardrobe, weather, calendar, and taste — connected by AI.

AURA is an AI Personal Style Operating System. It turns your wardrobe into a living intelligence system: daily outfit recommendations, trip packing, occasion planning, Style DNA, and Vision AI analysis — all in one place.

---

## Current Version

**v1.1.0 Preview** — Demo polish + investor narrative

---

## Features

| Feature | Description |
|---|---|
| Daily Briefing | AI outfit recommendation scored across occasion, weather, style, and color harmony |
| Vision AI | Analyze wardrobe items from photos — auto-detects category, color, style, season |
| Style DNA | Personal taste memory that grows from your outfit feedback and wardrobe signals |
| Trip Intelligence | Smart packing lists with weather, occasion tiers, daily outfit plans, and gap alerts |
| Occasion Planner | Event-aware outfit recommendations with formality scoring and weather context |
| AI Inspiration | Buy / Wait / Skip analysis — evaluates new pieces against your wardrobe |
| Analytics | Wardrobe coverage, gaps, wear frequency, Style DNA summary |
| Stylist Concierge | Coming in v1.2 — AI-prepared brief + human stylist session |

---

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

No environment variables are required. The app runs fully in mock/local mode by default (localStorage persistence, mock AI responses).

---

## Validation

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm run build       # Next.js production build
npm run validate    # All three in sequence
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | Supabase project URL — enables cloud persistence |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | Supabase anon key (public) |
| `AI_PROVIDER` | Optional | `openai` (default: `mock`) |
| `NEXT_PUBLIC_AI_PROVIDER` | Optional | Client-side provider hint |
| `OPENAI_API_KEY` | Optional | Server-side only — enables real AI |
| `WEATHER_API_KEY` | Optional | Server-side only — OpenWeather API |
| `NEXT_PUBLIC_ENABLE_DEMO_TOOLS` | Optional | Set to `true` to show demo tools (Load Demo Data, Clear Data, Demo Journey) |

Without Supabase vars, the app uses localStorage. Without AI keys, mock responses are returned.

---

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Run `supabase/v0.9_migration.sql` for occasion events support.
4. Create two storage buckets: `wardrobe-images` and `inspiration-images`.
5. Add to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router |
| Language | TypeScript |
| Styling | Plain CSS (custom design system) |
| Auth + DB | Supabase (Auth, Postgres, RLS, Storage) |
| AI | OpenAI API (Vision, GPT-4o-mini) |
| Weather | OpenWeather API |
| State | React Context + useReducer |
| Persistence | SupabaseRepository / LocalRepository (localStorage fallback) |

---

## Demo Mode

With `NEXT_PUBLIC_ENABLE_DEMO_TOOLS=true`:

- **Load Demo Data** button in the topbar seeds: 11 wardrobe items, 2 inspirations, 2 occasion events, 1 Paris trip plan, 1 saved outfit.
- **Clear Data** button resets all state.
- **Demo Journey** card appears on the Daily Briefing with a guided walkthrough sequence.

Demo tools are completely hidden when the flag is absent or false.

---

## Version History

| Version | Summary |
|---|---|
| v1.1.0 Preview | Demo polish, investor narrative, landing page, onboarding refinement |
| v1.0.0 | MVP hardening, onboarding checklist, empty states, demo mode, mobile pass |
| v0.9.0 | Calendar + Occasion Intelligence, weekly brief, outfit recommendations |
| v0.8.x | Packing + Trip Intelligence, weather, city/country auto-detect |
| v0.7.x | Wardrobe Vision AI, HEIC handling, correction tracking |
| v0.6.x | Style DNA, feedback learning, analytics |
| v0.5.x | Supabase Auth + RLS, SupabaseRepository |
| v0.3–0.4 | AI Inspiration, Buy/Wait/Skip, AI outfit API routes |
| v0.2 | Next.js + TypeScript foundation, Agent OS, Supabase schema |

---

## Project Structure

```
src/
  app/                    Next.js App Router (layout, page, globals.css)
  components/
    auth/                 AuthLanding, AuthModal, AuthSection
    layout/               Sidebar, Topbar, Toast
    views/                HomeView, WardrobeView, InspirationView, PackingView,
                          OccasionsView, StylistView, AnalyticsView, SettingsView
  lib/
    types.ts              All TypeScript types
    utils.ts              uid, scoreClass, fileToDataURL, isValidItemName
    version.ts            Version string and release notes
    repository/           IRepository interface, LocalRepository, SupabaseRepository
    occasions/            Occasion outfit engine (deterministic + optional AI)
    server/               Shared server helpers (weather, Supabase server client)
    supabase/             Client and server Supabase factory
  store/
    index.tsx             AuraProvider, useAura (React Context + useReducer)
    auth.tsx              AuthProvider, useAuth
    toast.tsx             ToastProvider, useToast
    default.ts            defaultState(), demo data generators

packages/
  ai/                     AIAdapter interface, createAIAdapter factory
    adapters/             mock, openai adapters
  agents/                 RecommendationAgent and supporting agents

supabase/
  schema.sql              Tables, RLS policies, storage bucket definitions
  v0.9_migration.sql      occasion_events table + RLS

docs/
  investor_demo_script.md Investor demo walkthrough and positioning
  v1.0_smoke_test.md      Manual QA checklist
  DEPLOYMENT_GUIDE.md     Production deployment steps
```

---

## Release Process

1. All development on feature branches (e.g. `v1.1-demo-polish-investor-narrative`).
2. Run `npm run validate` before any merge.
3. Update `src/lib/version.ts` with new version string and release notes.
4. Tag the release commit.
5. Do not merge to `main` without explicit sign-off.
