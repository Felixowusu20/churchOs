# ChurchOS — Next.js

Single Next.js app (UI + API routes). One process: `npm run dev`.

## Scripts

- `npm run dev` — Next.js on `$PORT` (default 3000)
- `npm run build` / `npm start` — production
- `npm run db:push` — sync Prisma schema
- `npm run db:seed` — seed events + sample finance

## Routes

- `/` landing
- `/login` admin sign-in / first-time create account
- `/app` admin dashboard
- `/app/check-in` biometric kiosk
- `/api/*` backend (auth, finance, events, uploads)

## Env

See `.env.example` / `.env.local` for `DATABASE_URL`, `CLOUDINARY_URL`, `ADMIN_JWT_SECRET`.
