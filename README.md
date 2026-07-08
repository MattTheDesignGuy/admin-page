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

None of this has been run yet — it needs your Cloudflare account.

1. **Create a Cloudflare account** if you don't have one, and install Wrangler CLI auth locally: `npx wrangler login` (opens a browser).
2. **Create the real D1 database and R2 bucket:**
   ```bash
   npx wrangler d1 create tdg-admin-db
   ```
   Copy the `database_id` it prints into `wrangler.toml` (replacing `"local-dev"`).
   ```bash
   npx wrangler r2 bucket create tdg-admin-files
   ```
3. **Apply the migration to the real database:**
   ```bash
   npx wrangler d1 migrations apply tdg-admin-db --remote
   ```
4. **Create the Pages project** (from this repo):
   ```bash
   npm run build
   npx wrangler pages project create tdg-admin
   npx wrangler pages deploy dist --project-name=tdg-admin
   ```
   Or connect the GitHub repo to Cloudflare Pages in the dashboard for git-push deploys — same build command (`npm run build`) and output directory (`dist`).
5. **Set the production secrets** (never commit these):
   ```bash
   npx wrangler pages secret put ADMIN_USERNAME --project-name=tdg-admin
   npx wrangler pages secret put ADMIN_PASSWORD_HASH --project-name=tdg-admin
   npx wrangler pages secret put SESSION_SECRET --project-name=tdg-admin
   npx wrangler pages secret put ANTHROPIC_API_KEY --project-name=tdg-admin
   ```
6. **Point the subdomain at Cloudflare Pages:** in GoDaddy DNS, add a CNAME record `admin` → the `*.pages.dev` target Cloudflare gives the project (or follow Cloudflare's custom domain flow from the Pages project settings, which issues HTTPS automatically). Confirm `https://admin.thedesignguy.com.au` loads and shows a valid certificate before treating it as live.

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
