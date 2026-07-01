# AURA — Investor Demo Script

## One-line positioning

**AURA is an AI Personal Style Operating System that connects wardrobe, weather, calendar, travel, and personal taste into one daily decision layer.**

---

## 60-second pitch

> "Every morning, most people stand in front of their wardrobe and waste 15 minutes asking: What do I wear today? AURA solves that — and everything that follows it.

> AURA knows your wardrobe. It knows the weather. It knows what occasion you're dressing for. It knows your travel plans and your calendar. And it learns your personal style over time.

> The result: one intelligent recommendation, scored and explained, every morning. Accept it, edit it, or reject it — and AURA gets smarter.

> This isn't a style app. It's a style operating system."

---

## 5-minute demo flow

### 1. AuthLanding (30 seconds)
- Show the landing screen: "Your wardrobe, weather, calendar, and taste — connected by AI."
- Explain: AURA is private by design. Wardrobe data stays with the user.
- Sign in or load directly with demo data.

### 2. Load Demo Data (30 seconds)
- Click **Load Demo Data** in the topbar.
- This seeds: 11 curated wardrobe items, 2 inspirations, 2 occasion events, 1 Paris trip plan, 1 saved outfit.
- Explain: "This is the kind of wardrobe AURA works with. Quiet luxury, business-ready, real items."

### 3. Daily Briefing (60 seconds)
- Show the home screen: greeting, city, weather, occasion.
- Point out the **AI Outfit Analysis** card: Compatibility score, Occasion Fit, Weather Fit, Style Match, Color Harmony.
- Show the reasoning summary: why this specific combination works.
- Accept the outfit — explain that AURA records the preference and increments wear counts.
- Explain: "This runs every day. Over time AURA builds a picture of your taste."

### 4. Wardrobe + Vision AI (60 seconds)
- Navigate to **Wardrobe**.
- Show the 11 demo items in the grid.
- Click any item to show the edit modal — AI metadata, confidence score, detected fields.
- Optionally: upload a new photo to trigger Vision AI analysis.
  - AURA analyzes the image, detects category/color/style/season, and pre-fills the form.
  - Any field the user changes is tracked as a "correction" — this feeds Style DNA.

### 5. Packing Intelligence (45 seconds)
- Navigate to **Packing**.
- Show the Paris trip plan (already loaded from demo data).
- Highlight: destination, dates, purpose, luggage type.
- Show packing list with priority tiers: Essential / Recommended / Optional.
- Show daily outfit suggestions and missing item alerts.
- Explain: "AURA pulls weather for Paris, maps your wardrobe to the trip, and flags gaps."

### 6. Occasion Intelligence (45 seconds)
- Navigate to **Occasions**.
- Show the Business Dinner — Beirut event.
- Click **Get Outfit Recommendation**.
- Show the recommendation: formality fit, weather context, outfit items, risks, alternatives.
- Accept it — status moves to "accepted".
- Explain: "AURA uses the same intelligence as daily briefing, but tuned for the specific occasion."

### 7. Analytics (30 seconds)
- Navigate to **Analytics**.
- Show: KPI grid (total items, avg confidence, wear frequency, coverage).
- Show category coverage — which categories are well-represented vs. thin.
- Show Style DNA panel — what AURA has learned about preferences.
- Explain: "Every interaction builds a richer model. More feedback = better recommendations."

### 8. Stylist Concierge teaser (15 seconds)
- Navigate to **Stylist Concierge**.
- Show the "Coming Next" placeholder.
- Explain: "This is where human experts enter. AURA prepares a full style brief from the user's data — the stylist starts with complete context, no intake form needed."

---

## Key proof points

| Capability | What to show |
|---|---|
| Wardrobe intelligence | 11 curated items, edit modal with AI metadata |
| Vision AI | Upload image → auto-detect category/color/style |
| Daily outfit engine | Compatibility score, 4-dimension analysis, reasoning |
| Weather integration | Live weather for user's city feeds outfit scoring |
| Style DNA | Confidence score grows with feedback |
| Trip intelligence | Packing list with priority tiers, weather, daily outfits |
| Occasion intelligence | Event-specific outfit recommendation with formality scoring |
| Correction tracking | Every AI field the user overrides is recorded |

---

## Current MVP capabilities (v1.1.0 Preview)

- Supabase Auth + RLS row-level security per user
- Wardrobe management: add, edit, delete, Vision AI analysis
- Daily outfit recommendation with 4-score analysis
- Weather integration (OpenWeather API)
- Browser geolocation with saved fallback
- Style DNA profile: computed from wardrobe + feedback signals
- Trip packing planner: weather, occasions, priority tiers, missing items
- Occasion event planner: outfit recommendation, formality scoring, weather context
- AI Inspiration: Buy / Wait / Skip analysis with wardrobe compatibility
- Analytics: coverage, gaps, wear frequency, feedback stats
- Investor demo mode: full data seed, isolated behind env flag
- Local-first fallback: full app works without Supabase (localStorage)

---

## What is intentionally not built yet

| Area | Reason |
|---|---|
| Stylist marketplace | Requires trust + vetting infrastructure |
| Real stylist booking | Coming in v1.2 |
| Payments / Stripe | Not needed for demo or MVP |
| Google Calendar sync | OAuth scope complexity — not MVP |
| Mobile app (native) | Web is sufficient for demo; native is v2.0 |
| Social / sharing | Out of scope for personal style OS positioning |
| Product recommendations / affiliate | Planned for monetization layer |
| Computer vision model fine-tuning | Using OpenAI Vision API; own model is v2.0 |

---

## v1.2+ roadmap ideas

1. **Stylist Concierge v1** — AI-prepared brief + human stylist session booking
2. **Occasion-aware packing** — auto-generate packing list from calendar events
3. **Purchase intelligence** — buy signal when wardrobe gap matches occasion need
4. **Style DNA recommendations** — "Your Style DNA suggests you'd wear this"
5. **Multi-wardrobe** — seasonal storage, capsule wardrobes, partner wardrobe
6. **Mobile app** — React Native, camera-first wardrobe building
7. **Affiliate/shopping layer** — curated recommendations linked to purchase
8. **Team/brand accounts** — outfit curation for events, PR, editorial

---

## Demo environment setup

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
OPENAI_API_KEY=...         (server-side only)
WEATHER_API_KEY=...        (server-side only)
NEXT_PUBLIC_ENABLE_DEMO_TOOLS=true
AI_PROVIDER=openai
```

Without `NEXT_PUBLIC_ENABLE_DEMO_TOOLS=true`, the demo tools (Load Demo Data, Clear Data, Demo Journey card) are hidden from all users.
