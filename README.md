# TDG Admin

Internal, single-user income & expense tracker for The Design Guy. Upload income invoices and expense receipts, let Claude extract the fields, confirm/edit, and it's saved to a ledger you can filter, edit, and export to CSV for tax time.

- **Frontend:** Vite + React + TypeScript + Tailwind
- **Backend:** Cloudflare Pages Functions (Workers) + D1 (records) + R2 (original files)
- **Extraction:** Anthropic Messages API, called server-side, structured JSON via forced tool use
- **Auth:** single hardcoded user, PBKDF2 password hash, signed session cookie — enforced server-side on every `/api/*` route

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars   # fill in the values below
node scripts/hash-password.mjs "your-chosen-password"   # paste result into .dev.vars
npx wrangler d1 migrations apply tdg-admin-db --local    # first run only
npm run pages:dev                                        # builds + runs the full stack on :8788
```

`npm run dev` alone only runs the Vite frontend (no `/api/*` routes) — use `npm run pages:dev` to exercise the real app, since it's the Worker backend that serves auth, D1, R2, and Claude extraction.

`.dev.vars` (git-ignored) needs:

| Var | Value |
| --- | --- |
| `ADMIN_USERNAME` | your login username |
| `ADMIN_PASSWORD_HASH` | output of `node scripts/hash-password.mjs "<password>"` |
| `SESSION_SECRET` | any long random string |
| `ANTHROPIC_API_KEY` | an Anthropic API key — extraction returns a 503 until this is set |

## Deploying to Cloudflare (`admin.thedesignguy.com.au`)

**Live at:** https://tdg-admin-page.pages.dev — D1 database, R2 bucket, Pages project, and all four secrets (`ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `ANTHROPIC_API_KEY`) are provisioned on the real Cloudflare account.

**To redeploy after a code change:**
```bash
npm run build
npx wrangler pages deploy dist --project-name=tdg-admin-page
```
(Requires `wrangler login`, or a `CLOUDFLARE_API_TOKEN` env var set to a token with Cloudflare Pages / D1 / Workers R2 Storage / Workers Scripts edit permissions.)

**To update a secret:**
```bash
npx wrangler pages secret put SECRET_NAME --project-name=tdg-admin-page
```

**Custom domain (`admin.thedesignguy.com.au`) — remaining step:** in the Cloudflare dashboard, open the **tdg-admin-page** project → **Domains** tab → **Set up a custom domain** → enter `admin.thedesignguy.com.au`. It gives a CNAME target; add that as a CNAME record for `admin` in GoDaddy DNS (nameservers stay on GoDaddy — no need to migrate DNS to Cloudflare). Confirm `https://admin.thedesignguy.com.au` loads with a valid certificate before treating it as live.

**Git-connected auto-deploy:** a GitHub integration exists on the Pages project but its auto-generated build token is under-permissioned (missing Cloudflare Pages edit access), so pushes to `main` don't currently auto-deploy — redeploy manually with the command above, or fix the token's permissions in the project's Settings → Build → API token.

## Project structure

```
functions/api/          Cloudflare Pages Functions (the backend)
  auth/                 login, logout, me
  records/               list/create, edit/delete
  extract/               Claude PDF/image → structured JSON
  files/                  serves originals from R2 (auth-gated)
  export/csv.ts           CSV export
  dashboard/summary.ts     FY totals + monthly chart data
  _middleware.ts         session-cookie guard for everything except /api/auth/*
migrations/0001_init.sql D1 schema
src/                    Vite React frontend
  components/            design-system primitives (Button, Card, Dialog, ...)
  pages/                 Login, Dashboard, IncomeUpload, ExpenseUpload, Ledger
  styles/tokens/          colors, typography, spacing — mapped into Tailwind's @theme
scripts/hash-password.mjs  generates ADMIN_PASSWORD_HASH
```

## Not yet built

- Recurring-expense quick re-entry (deferred by design — see brief).
- Live end-to-end test of the Claude extraction call, since it needs a real `ANTHROPIC_API_KEY`. The request shape was verified for correctness; run a real invoice/receipt through it once the key is set.
