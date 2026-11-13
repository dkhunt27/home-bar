# Home Bar

A mobile-first web app for tracking a Bartesian capsule cabinet. Guests scan the bar's QR
code (or open the guest link), type their name, browse what's in stock, and tap **Take one**,
which takes one off the count. The owner signs in by magic link and can restock, fix counts, add capsules from
the Bartesian catalog, set the low-stock threshold, and get an email when something runs low.
Every pour and restock lands in a shared activity log, and counts update live on every phone.

The design is direction 1a ("Speakeasy") from the handoff in [`design/`](design/README.md).
The structure follows `lo30-react-supabase`: React 19 + Vite + TypeScript, Supabase (Postgres,
Auth, Realtime), TanStack Query, react-router v7, and a Cloudflare Worker in front of the SPA.

## Run it locally

Needs Node 26 (pinned in [`.node-version`](.node-version); with `n`, run `n auto` in the repo),
Docker, and the Supabase CLI (also installed as a dev dependency).

```sh
npm install
npx supabase start          # local stack on ports 5532x (runs alongside lo30's 5432x)
cp .env.example .env        # paste the publishable key `supabase start` printed
npm run dev                 # http://localhost:5174
```

- **Guest:** open <http://localhost:5174/sign-in#k=local-guest-key>, then any name.
- **Owner:** the Owner tab with `owner@homebar.dev`. The magic link arrives in Mailpit at
  <http://127.0.0.1:55324>.

The seed matches the design prototype: 17 capsules on the shelf, a few running low or out,
and a short activity log. `npm run reset:local` puts it back, and regenerates the DB types.

## Commands

| Command                    | What it does                                                          |
| -------------------------- | --------------------------------------------------------------------- |
| `npm run dev`              | Vite + the Worker (`/api/*`) via the Cloudflare plugin                |
| `npm test`                 | Vitest unit tests (shelf rules, activity formatting)                  |
| `npm run lint`             | `tsc -b` + Biome                                                      |
| `npm run lint:fix`         | Biome safe fixes and formatting                                       |
| `npm run reset:local`      | Reset the local DB, reseed, regenerate `src/types/database.gen.ts`    |
| `npm run gen:types`        | Regenerate DB types after a migration                                 |
| `npm run gen:worker-types` | Regenerate `worker-configuration.d.ts` after editing `wrangler.jsonc` |
| `npm run gen:catalog`      | Regenerate the capsule-catalog migration from `design/capsules.json`  |
| `npm run gen:pwa-icons`    | Regenerate the home-screen icons and favicon                          |
| `npm run build:prod`       | Production build against the Supabase project in `wrangler.jsonc`     |
| `npm run push:prod`        | ⚠️ Apply migrations to the linked remote Supabase project             |
| `npm run add-owner`        | ⚠️ Make an email the remote project's owner (see Deploy)              |

## How it works

- **Guests** join by the guest link, usually as the QR code on Manage → Guest link. The link
  carries a random 144-bit key in its `#fragment`, so there's nothing to guess and no lockout
  to trip. Guests get an anonymous Supabase session, and `join_bar(name, key)` records them as
  a guest if the key is current. The owner gets an email naming each new guest; **New link**
  retires the old one and signs everyone out.
- **The owner** is whoever signs in by magic link with `settings_private.owner_email`. Links
  only go to existing users, so the Owner form can't be used to email strangers.
- **Every stock change is a Postgres function**, so a count and its log row always change
  together. `take_capsule` only decrements when there's one left, so two guests tapping the
  last Margarita can't both get it. `undo_take` works on your own pour, within 5 minutes.
  Guests can't write to any table directly.
- **Low-stock email:** a pour that leaves a capsule low (or empty) queues an alert. The app
  then pings the Worker (`POST /api/low-stock/notify`), which emails the owner through Maileroo.
  A 30-minute cron retries anything missed, sends the new-guest emails, deletes anonymous
  sessions that never joined (or were signed out), and keeps a free Supabase project from
  pausing between parties.

## Deploy

One-time setup:

1. **Supabase:** create a project, then `npx supabase link --project-ref <ref>` and
   `npm run push:prod`.
   - Dashboard → Authentication → Sign In / Providers: turn on **Anonymous sign-ins**.
   - Authentication → URL Configuration: set the Site URL to the deployed address.
   - Make yourself the owner. This creates your user (sign-in links only go to existing
     users) and sets `owner_email`. The key is the project's secret key, from Project
     Settings → API Keys:

     ```sh
     SUPABASE_SERVICE_ROLE_KEY=<secret key> npm run add-owner -- you@example.com
     ```

   - Run [`supabase/snippets/configure-bar.sql`](supabase/snippets/configure-bar.sql) in the
     SQL editor to set your name and the bar's.
   - Recommended: Authentication → Emails → SMTP, using SMTP credentials from Maileroo
     (`smtp.maileroo.com`). Supabase's built-in sender only sends a couple of emails an hour.
2. **Cloudflare:** put the project's URL and publishable key in `wrangler.jsonc` `vars`, and
   set `APP_URL` and `ALERT_FROM_EMAIL` (on a domain verified in Maileroo). Then:

   ```sh
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   npx wrangler secret put MAILEROO_API_KEY
   npm run deploy:manual:web
   ```

3. **GitHub (optional):** push to `main` to deploy via
   [`deploy-prod.yml`](.github/workflows/deploy-prod.yml). It needs the
   `CLOUDFLARE_API_TOKEN` secret and the `CLOUDFLARE_ACCOUNT_ID` variable.

Without the two secrets (or `ALERT_FROM_EMAIL`) the app works fully; you just don't get the
low-stock or new-guest emails. The owner still sees the in-app low-stock banner either way.
Without `SUPABASE_SERVICE_ROLE_KEY`, stale anonymous sessions aren't cleaned up either.

## Notes

- Capsule photos are hotlinked from Bartesian's Shopify CDN and cached by the service worker.
  They're Bartesian's product photos, so keep this personal.
- If the guest link gets around, tap **New link** on Manage → Guest link. The old link stops
  working and every guest is signed out until they use the new one.
