# AURA — AI Personal Style Operating System

**v0.2** — Next.js + TypeScript production foundation with Supabase-ready architecture and Agent OS.

> The original v0.1 vanilla JS files (`index.html`, `app.js`, `styles.css`, `server.js`) are preserved at the repo root for reference.

---

## Features

- Daily Briefing — outfit recommendation from wardrobe
- Wardrobe management — add items, image upload, demo data
- AI Inspiration — Buy / Wait / Skip analysis via InspirationAgent
- Packing planner — travel-aware wardrobe selection
- Stylist Network — AI-matched human stylist brief
- Analytics — wardrobe health and coverage
- Settings — style context (name, city, temp, occasion, goal, budget)
- Local-first persistence — works without any backend (localStorage fallback)
- Agent OS — VisionAgent, InspirationAgent, StylistAgent, RecommendationAgent, MemoryAgent, ShoppingAgent, ExplanationAgent
- Provider-agnostic AI — mock (default), OpenAI, Anthropic, Gemini adapters
- Supabase-ready — schema, RLS policies, storage buckets defined

---

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

No environment variables are required. The app runs fully in mock/local mode by default.

---

## Validate Before Deploy

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm run build       # Next.js production build
npm run validate    # All three in sequence
```

---

## Supabase Setup (optional — enables cloud persistence)

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Create two storage buckets: `wardrobe-images` and `inspiration-images`.
4. Copy your project URL and anon key to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

The app automatically switches from localStorage to Supabase when these vars are present.

---

## AI Provider Setup (optional — enables real AI)

Set `NEXT_PUBLIC_AI_PROVIDER` to `openai`, `anthropic`, or `gemini` in `.env.local`, then add the corresponding server-side API key. Real AI calls will be routed through `/api/ai` (planned for v0.3).

Without these vars, the built-in mock adapter is used — the app is fully functional.

---

## Vercel Deployment

1. Push this repo to GitHub.
2. Import in Vercel — framework is detected as **Next.js** automatically.
3. Add environment variables in the Vercel dashboard (optional).
4. Deploy.

---

## Project Structure

```
src/
  app/                  Next.js App Router (layout, page, globals.css)
  components/
    layout/             Sidebar, Topbar, Toast
    views/              HomeView, WardrobeView, InspirationView, PackingView,
                        StylistView, AnalyticsView, SettingsView
  lib/
    types.ts            All TypeScript types
    utils.ts            uid, scoreClass, fileToDataURL
    repository/         IRepository interface, LocalRepository, SupabaseRepository
  store/
    index.tsx           AuraProvider, useAura (React Context + useReducer)
    toast.tsx           ToastProvider, useToast
    default.ts          defaultState(), makeDemoItems()

packages/
  ai/                   AIAdapter interface, createAIAdapter factory
    adapters/           mock, openai, anthropic, gemini
  agents/               VisionAgent, InspirationAgent, StylistAgent,
                        RecommendationAgent, MemoryAgent, ShoppingAgent, ExplanationAgent
  recommendation/       Re-exports RecommendationAgent
  memory/               Re-exports MemoryAgent
  storage/              Storage upload abstraction

supabase/
  schema.sql            Tables, RLS policies, storage bucket definitions
```

---

## Known Limitations (v0.2)

| Area | Status |
|---|---|
| Auth | Not yet wired — all data is per-browser |
| Supabase persistence | Schema ready, SupabaseRepository is a placeholder (v0.3) |
| Real AI calls | Adapters defined, routing via /api/ai planned for v0.3 |
| Image storage | Base64 in localStorage; Supabase Storage bucket defined for v0.3 |
| Payments / checkout | Not included — Stripe planned for v0.4 |
| Marketplace | Not included — planned for v0.4+ |

---

## Roadmap

| Version | Focus |
|---|---|
| v0.2 | Next.js + TS foundation, Agent OS, Supabase schema ✅ |
| v0.3 | Supabase auth + persistence, real AI via API routes, image storage |
| v0.4 | Stripe checkout, marketplace integrations |
| v1.0 | Multi-user, stylist marketplace, full Agent OS, mobile app |
