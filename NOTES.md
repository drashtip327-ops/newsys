# Implementation notes

The application uses Next.js, TypeScript, plain CSS, and a NestJS backend. npm workspaces manage both applications. The Seed JSON remains unchanged, and localStorage persists payments and audit logs.

Accounts employee, manager, and md use passwords `employee@123`, `manager@123`, and `md@123`. The server issues an HttpOnly session cookie. A global guard derives the role from that session and enforces page permissions. The former role-header shortcut and role dropdown have been removed.

MD can change the approval threshold, allowed resubmission count, and minimum rejection-comment length. MD can also manage Payments and Audit page access. Both administration pages remain MD-only. Settings persist in a small local JSON file; sessions are held in memory and require login again after a backend restart.

Run `npm install` followed by `npm run dev` from the project root, then open http://localhost:3000/login. Run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build` for checks.

The responsive UI includes password visibility, advanced payment/audit filters, pagination, filtered CSV export, approvals, summaries, and reset. This is a local demo: payment snapshots remain browser-controlled, and production identity management is outside its scope.
