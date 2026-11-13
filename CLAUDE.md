# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Home Bar: a mobile-first tracker for a Bartesian capsule cabinet. Guests (guest link/QR code +
name) browse stock and take capsules; the owner (magic link) restocks and gets low-stock emails.
React 19 + Vite + TypeScript + Supabase (Postgres, Auth, Realtime) + TanStack Query +
react-router v7, fronted by a Cloudflare Worker. Structure mirrors `../lo30-react-supabase`.

## Commands

- Node 26, pinned in `.node-version` (CI reads it too). Keep `@types/node` on the same major.
- `npm run dev`: Vite on **5174** (strict; the auth redirect URLs name it) plus the Worker
- `npm test`: Vitest. `npm run lint`: `tsc -b` + Biome (no eslint/prettier)
- `npm run reset:local`: reset the local DB, reseed, regenerate `src/types/database.gen.ts`
- `npm run gen:types` after any migration; `npm run gen:worker-types` after editing
  `wrangler.jsonc`
- Local Supabase uses ports **5532x** (API 55321, DB 55322, Studio 55323, Mailpit 55324), so it
  runs next to lo30's 5432x stack
- ⚠️ `push:prod`, `deploy:manual:web` and `add-owner` touch the live remote. Never run them
  unless asked. (`add-owner` hits local instead with `SUPABASE_URL=http://127.0.0.1:55321`.)
- Supabase CLI v3: every command targets the **local** stack unless given `--remote`
  (`push:prod` passes it), and hosted changes ask for confirmation.
- `package.json` `overrides` pins `@babel/plugin-transform-runtime` to 7 only to get past an
  npm optional-peer conflict between `@vitejs/plugin-react` and `workbox-build` (Babel 7).
  Nothing installs it; drop the override once workbox moves to Babel 8. `allowScripts` names
  exact `workerd` versions, so after a wrangler update run `npm install-scripts approve workerd`.

## Design

`design/` is the frozen handoff: `README.md` (spec + tokens), `screenshots/`, and the HTML
prototype. Only direction **1a** is in scope. It's high fidelity: match it at 390px wide. Tokens
are CSS variables in `src/index.css`. No MUI: styling is CSS Modules (`*.module.css` next to
each component/page) plus shared atoms in `src/components/ui.module.css`.

- **CSS Modules ordering gotcha**: a page module loads after `ui.module.css`, so combining
  `ui.lowText` with a page class that sets `color` loses. Each page defines its own `.low`
  modifier at the end of its module instead.
- Capsule photos always sit on the tile color with `mix-blend-mode: multiply`; use
  `CapsuleTile` and `sizedImage()` (Shopify CDN `width=` param), never a bare `<img>`.

## Architecture

- **Routes** live in `src/routes.ts` (`ROUTES`); never hardcode paths. `src/app.tsx` uses a data
  router (`createBrowserRouter`) for `<ScrollRestoration />`. Guards: `RouteGuardMember`,
  `RouteGuardOwner`. Tab screens (Bar/Activity/Manage) render inside `TabLayout`, which owns
  the bottom nav. The Bar's spirit filter is the `?spirit=` param, so Back restores it.
- **Auth** (`src/hooks/use-auth.tsx`): `me` comes from the `get_me()` RPC, not the JWT.
  Guests: `signInAnonymously()` then `join_bar(name, key)`, the key coming from the guest
  link's `#k=` fragment (`joinKeyFromHash` in `bar.ts`); the owner shows its QR code on Manage
  → Guest link. The owner is whoever's confirmed email equals `settings_private.owner_email`.
  Magic links only go to existing users (`shouldCreateUser: false`), so the owner's auth user
  must exist first (`seed.sql` creates it locally). A non-owner magic link is signed straight out.
- **Data layer**: components call `src/lib/db/*-db.ts`, wrapped in TanStack Query with keys
  from `QK` (`src/lib/query-keys.ts`). Shared queries and mutations are in
  `src/hooks/use-bar-data.ts` and `use-bar-mutations.ts`. Pure rules (sort, visibility, tabs,
  copy) live in `src/lib/bar.ts` and `activity-format.ts`, which are unit-tested. Put new rules
  there, not in components.
- **Realtime** (`use-bar-realtime.ts`): stock/activity/settings changes invalidate queries, but
  not while a mutation is in flight (it would overwrite optimistic counts).
- **Worker** (`worker/`): `POST /api/low-stock/notify` plus a 30-min cron, both running
  `flushLowStockAlerts`. The cron also emails new guests' names (`flushGuestJoinAlerts`) and
  runs `delete_stale_anonymous_users()`. Shared email code is in `worker/mail.ts`. Worker
  routes must be in `assets.run_worker_first` and the PWA `navigateFallbackDenylist`.

## Database rules (`supabase/migrations/`)

- Data API access is **read-only** except `settings` (owner UPDATE via RLS). Every stock change
  is a SECURITY DEFINER function (`take_capsule`, `undo_take`, `add_box`, `adjust_stock`) that
  checks the role itself and writes the count and the `activity` row together. Keep it that
  way: no write policies on `stock`/`activity`.
- Those functions RAISE short codes (`out_of_stock`, `not_owner`, `undo_expired`...) that
  `src/lib/errors.ts` maps to copy. Add new codes in both places.
- `join_bar` returns a status string (`bad_key`, `no_name`...) instead of raising; the sign-in
  page maps those to copy. There's no throttle: the key is 144 random bits.
- `settings_private`, `guests`, `guest_join_alerts`, `low_stock_alerts`: RLS on, **no
  policies**. Only definer functions and the service role touch them.
- Policies wrap role checks as `(SELECT is_member())` so they're evaluated once per statement.
- New tables get **no** privileges by default (`016_table_grants.sql`; the hosted project never
  granted them, and local now matches). A migration that creates a table must GRANT what each
  role needs, including `service_role`, or it fails with "permission denied".
- The catalog (`007_capsules_catalog.sql`) is generated: `npm run gen:catalog`. To refresh it
  later, write a new migration with the script; don't edit the applied one.
- `seed.sql` is local only (owner `owner@homebar.dev`, guest link
  `http://localhost:5174/sign-in#k=local-guest-key`).

## Conventions

- kebab-case files; named exports except page components (default, for `React.lazy`)
- Biome: double quotes, semicolons, trailing commas, 2-space indent, 100-char lines
- Comments explain _why_; match the density of the surrounding code
