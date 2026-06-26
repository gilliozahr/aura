# Founder Implementation Guide — AURA App v0.1

## What You Have Now

A working browser app prototype.

It runs locally without dependencies and can be deployed immediately as a static/prototype app.

## Step-by-Step: Open in Claude Code

1. Unzip `AURA_App_v0_1.zip`.
2. Open Claude Code.
3. Open the unzipped folder as the project.
4. Tell Claude:

```text
Read README.md first.

This is the runnable AURA v0.1 prototype.

Your job is to convert this prototype into the production AURA app using the AURA Codex artifacts.

Do not change the user experience unless it improves quality.

First create a Next.js + TypeScript + PostgreSQL version using the same screens and flows.

Preserve:
- Daily Briefing
- Wardrobe
- AI Inspiration
- Buy / Wait / Skip
- Mock Ordering
- Packing
- Stylist Network
- Analytics

Replace localStorage with database models.
Replace mock AI scoring with provider-agnostic AI adapter.
Keep the Recommendation Engine deterministic and explainable.
```

## Step-by-Step: Run Locally

```bash
cd AURA_App_v0_1
node server.js
```

Open:

```text
http://localhost:5173
```

## Step-by-Step: Validate

```bash
npm run validate
```

## Best Infra for Prototype

Deploy this prototype on:

- Vercel
- Netlify
- Cloudflare Pages
- Any static host

## Best Infra for Production MVP

Use:

- Vercel for Next.js
- Supabase for PostgreSQL/Auth
- Supabase Storage or Cloudflare R2 for images
- OpenAI/Anthropic/Gemini through AI adapter
- Sentry for error tracking
- PostHog for analytics
- Resend for email
- Stripe for subscriptions

## Best Infra for Billion-Dollar Platform

When scaling:

- AWS or GCP
- Managed PostgreSQL
- Object storage
- Redis cache
- Queue system
- Dedicated AI worker services
- Knowledge graph store
- Vector search
- Partner API gateway
- Observability platform
- Feature flags
- Multi-region deployment

## Do This Next

Run the prototype.

Then ask Claude Code to convert it into a production Next.js monorepo using the Control Center build order.
