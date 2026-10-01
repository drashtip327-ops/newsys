# Vercel production deployment

Both projects deploy from https://github.com/drashtip327-ops/newsys on the main branch.

| Service | Vercel project | Root directory | Live URL |
| --- | --- | --- | --- |
| Frontend | newsys | . | https://newsys-chi.vercel.app |
| Backend | newsys-vsx6 | backend | https://newsys-vsx6.vercel.app |

The frontend configuration is in the root vercel.json. It builds Next.js with npm run build:frontend and uses frontend/.next as the output. Its production BACKEND_URL is https://newsys-vsx6.vercel.app. Leave NEXT_PUBLIC_API_URL unset. Browser requests use /api on the frontend domain; Next.js rewrites them to the backend, keeping authentication cookies on the frontend domain.

The backend configuration is backend/vercel.json. It installs the root npm workspace dependencies, compiles NestJS with tsc, and runs backend/api/index.js as a Vercel Function. The entry point loads compiled JavaScript to preserve Nest dependency injection metadata. FRONTEND_ORIGIN is https://newsys-chi.vercel.app. Cookies are Secure, HttpOnly and SameSite=Lax in production. The public readiness endpoint is /api/health and checks shared storage access.

The private Vercel Blob store newsys-private is connected only to the backend production environment. Vercel supplies BLOB_READ_WRITE_TOKEN; never commit or expose it to the frontend. Sessions, workflow settings and permissions live in private blobs and survive backend deployments. Reads bypass the Blob CDN cache so permission updates and logout revocation are immediate. Settings fields have separate keys so a configuration update cannot overwrite concurrent permission changes. Sessions expire after eight hours. Redis REST storage is also supported when KV_REST_API_URL and KV_REST_API_TOKEN are supplied and Blob is not configured.

Local development retains the existing in-memory sessions and settings JSON file. Payment records retain the original browser-local snapshot model: the backend validates and processes snapshots, rather than storing a shared payments database.

## Deploy and verify

Vercel projects are connected to the GitHub repository. Push main to trigger deployments of both services. For a manual deployment from the repository root:

```sh
vercel link --yes --project newsys-vsx6
vercel deploy --prod --yes --local-config backend/vercel.json
vercel link --yes --project newsys
vercel deploy --prod --yes
npm run test:production
```

Run npm test and npm run lint before deploying. The production test checks public frontend HTML, both health endpoints, API forwarding, role logins, cookies, session sharing, creation and approvals, audit, settings write/read/restore, origin protection and logout. Its payment changes are held in test snapshots. It temporarily changes one configuration value and restores it in a finally block. Override FRONTEND_URL and BACKEND_URL to check other environments.

Demo credentials: employee / employee@123, manager / manager@123, md / md@123.

Verified on October 1, 2026: both production builds, 25 local tests, lint, and the production verification script passed.
