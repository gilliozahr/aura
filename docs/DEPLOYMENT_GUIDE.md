# Deployment Guide — AURA App v0.1

## Fastest Deployment: Netlify Drop

1. Unzip the package.
2. Go to Netlify Drop.
3. Drag the entire `AURA_App_v0_1` folder.
4. Netlify will publish it.

## Recommended Prototype Deployment: Vercel

1. Create a GitHub repo.
2. Push all files.
3. Import in Vercel.
4. Set framework as Other.
5. Leave build command empty.
6. Set output directory to `.`
7. Deploy.

## Production Deployment Path

Do not use this static version for real users with personal wardrobe data.

Production requires:
- Authentication
- Database
- Secure image storage
- Privacy policy
- Data deletion/export
- AI provider security
- Monitoring
- Backups

Recommended production stack:
- Next.js on Vercel
- Supabase Postgres/Auth
- Cloudflare R2 or S3
- AI adapter service
- Background workers
- Sentry
- PostHog
