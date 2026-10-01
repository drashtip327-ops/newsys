# Vercel deployment

The frontend is configured for Vercel. Login requires the NestJS backend, which currently needs a persistent Node server. A Vercel-only deployment requires migrating settings and sessions to external storage first.

## Frontend on Vercel, backend on a persistent server

1. Upload the application files to GitHub. The checkout at `D:\section5\section5` currently contains only `.gitattributes`; the application is one directory above it. Include frontend, backend, shared, scripts, tests, package.json, package-lock.json, vercel.json, and Section5_Seed_Data.json. Exclude node_modules, .next, dist, local environment files and backend/data.
2. Deploy the backend using Node 24 and the repository root. Build: `npm ci && npm run build --workspace backend`. Start: `npm start --workspace backend`.
3. Set backend environment variables: `NODE_ENV=production`, `HOST=0.0.0.0`, the host-provided `PORT`, `FRONTEND_ORIGIN=https://YOUR-PROJECT.vercel.app`, and `SETTINGS_FILE=/YOUR-PERSISTENT-DISK/settings.json`. Mount a persistent disk there. Run one backend instance: sessions are in memory and settings use one JSON file. Backend restarts sign everyone out.
4. Import `drashtip327-ops/section5` in Vercel. Root Directory: `./` (repository root). Framework: Next.js. Node.js: 24.x. The included vercel.json sets Install Command `npm ci`, Build Command `npm run build:frontend`, Output Directory `frontend/.next`.
5. Add Vercel environment variable `BACKEND_URL=https://YOUR-BACKEND-HOST` without `/api`. Leave `NEXT_PUBLIC_API_URL` unset. Add BACKEND_URL for every deployment environment you use, then deploy. Changing it requires rebuilding.
6. Verify login for all roles, request creation and approvals, MD settings/permissions, and logout. Restart the backend to verify settings persistence. Payment records remain local to each browser.

## How the code works

The browser calls `/api` on the frontend's own domain. Rewrites in `frontend/next.config.ts` forward requests to BACKEND_URL. Login cookies return through that same domain, avoiding cross-site cookie problems. Production cookies are HttpOnly and Secure. Locally the backend URL defaults to http://localhost:3001, so npm run dev still works.

## Everything on Vercel

Replace in-memory sessions and local settings JSON with durable shared storage and adapt the backend entry point to Vercel Functions. Using `/tmp` would lose settings. A storage provider/account must be selected before implementing this option. No cloud services have been provisioned or deployed yet.

Demo credentials remain employee/employee@123, manager/manager@123, md/md@123. The application accepts browser-held payment snapshots and is a demonstration, not a shared financial database.

References: [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [Monorepos](https://vercel.com/docs/monorepos), [Function limits](https://vercel.com/docs/functions/limitations).
