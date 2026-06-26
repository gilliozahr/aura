# AURA App v0.1

A runnable local-first MVP prototype for **AURA — AI Personal Style Operating System**.

This is not the final billion-dollar production platform yet. It is the first working app foundation that demonstrates the core AURA experience:

- Daily briefing
- Wardrobe management
- Local image upload
- Recommendation logic
- AI Inspiration analysis
- Buy / Wait / Skip decision
- Mock direct ordering
- Packing planner
- Human stylist matching
- Analytics
- Local-first persistence using browser localStorage

## Run Locally

No external dependencies are required.

```bash
node server.js
```

Open:

```text
http://localhost:5173
```

Alternative:

```bash
python3 -m http.server 5173
```

## Validate

```bash
npm run validate
```

This checks JavaScript syntax for `app.js` and `server.js`.

## Deploy Quickly

### Vercel

1. Upload this folder to GitHub.
2. Import the repo in Vercel.
3. Framework preset: Other.
4. Build command: leave empty.
5. Output directory: `.`.
6. Deploy.

### Netlify

1. Drag and drop the folder to Netlify Drop, or connect GitHub.
2. Build command: leave empty.
3. Publish directory: `.`.

### Docker / Any VPS

Use the included `server.js`:

```bash
node server.js
```

## Important

This version uses localStorage and mock AI logic. The production version should replace local-only state with:

- Supabase or PostgreSQL
- Auth
- Object storage
- Real AI provider adapter
- Background job queue
- Recommendation Engine package
- Agent OS package
- Marketplace integrations
