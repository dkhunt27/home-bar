# Launch checklist

The full walkthrough for getting Home Bar live, in order. The README's Deploy section is the
short version. Claude Code can do the steps marked **(Claude)** in the repo. The rest need your
browser, a password or a dashboard.

Status on 2026-11-13:

- Lint and all 31 unit tests pass.
- `wrangler.jsonc` already points at the home-bar project (`mhsohmkiefatecjgaehk`, in your
  personal Supabase account), and the CLI is already linked to it (`supabase/.temp`). It was
  paused on 2026-11-13 and restored the same day. All 16 migrations were already applied, and
  the publishable key in `wrangler.jsonc` works.
- Wrangler's Cloudflare login has expired.
- The Supabase CLI is now logged into your personal account (dkhunt27's Org). That replaced the
  hockey account's login, which lo30's hosted project needs. Log back into that one before
  running remote Supabase commands in lo30.
- `main` is on GitHub. Its first Deploy Production run failed only because the repo has no
  `CLOUDFLARE_API_TOKEN` yet: lint, tests and the build passed. Phase 6 sets it.

## 1. Accounts

- [x] **Wake the project.** Open
      [the home-bar project](https://supabase.com/dashboard/project/mhsohmkiefatecjgaehk). If it
      says Paused, click Restore project and wait a few minutes. Free projects pause after about
      a week without traffic. Once the site is deployed, the Worker's 30-minute cron keeps it
      awake.
- [x] **Database password:** not needed so far, because the CLI signs in with a temporary login
      role. If a future `push:prod` asks for it, reset it under Project Settings → Database.
- [x] **Log the CLI into your personal account:** `npx supabase login`. Check it with
      `npx supabase projects list`, which should list home-bar. To keep lo30's login instead, run
      `export SUPABASE_ACCESS_TOKEN=sbp_…` in the home-bar terminal, using a token from your
      personal account's Account → Access Tokens.
- [x] **Log in to Cloudflare:** `npx wrangler login`. It opens your browser to approve.
- [x] **Check the publishable key.** Project Settings → API Keys should show the same
      `sb_publishable_…` key as `wrangler.jsonc` `vars`. If it differs, update `wrangler.jsonc`
      (Claude) and run `npm run gen:worker-types`. The key is public by design, so it's fine to
      commit.

## 2. Database

- [x] **Point the app at the project:** `wrangler.jsonc` `vars` already have its URL and key.
- [x] **Link the CLI:** already linked. Re-run `npx supabase link --project-ref mhsohmkiefatecjgaehk`
      only if `supabase/.temp` gets deleted.
- [x] **See what's applied:** `npx supabase migration list --remote`. It shows which of migrations
      001–016 are already on the project. All 16 were there on 2026-11-13.
- [x] **Apply the rest:** `npm run push:prod`. Nothing to apply now. Run it after adding a
      migration: it lists the missing ones and asks you to confirm. The local seed data never
      goes to the hosted project, so a fresh project starts with an empty shelf that you stock
      from Manage.

## 3. Supabase settings

- [x] **Turn on anonymous sign-ins:** Authentication → Sign In / Providers → Anonymous sign-ins.
      Guests can't join without it.
- [x] **Make yourself the owner.** Copy the secret key (`sb_secret_…`) from Project Settings →
      API Keys, then:

      ```sh
      SUPABASE_SERVICE_ROLE_KEY=<secret key> npm run add-owner -- you@example.com
      ```

      This creates your user, already confirmed (sign-in links only go to existing users), and
      sets `settings_private.owner_email`. It targets the URL in `wrangler.jsonc`, so phase 2 must
      be done first.
- [x] **Name the bar:** in the SQL editor, run
      [`supabase/snippets/configure-bar.sql`](supabase/snippets/configure-bar.sql) with your name,
      the bar's name and the low-stock threshold. Change the values in the editor, not the file.
- [ ] **Optional, SMTP for sign-in emails:** Authentication → Emails → SMTP Settings, with
      Maileroo's SMTP credentials (`smtp.maileroo.com`). Supabase's built-in sender only manages
      a couple of emails an hour. That's enough for one owner signing in now and then, but it
      runs out fast if you're testing.

## 4. First deploy

- [x] **Deploy:** `npm run deploy:manual:web`. This builds against the project in `wrangler.jsonc`
      and runs `wrangler deploy`. If your account has no workers.dev subdomain yet, wrangler asks
      you to pick one. It prints the live URL, which was
      <https://home-bar.home-bar.workers.dev> until phase 7 moved the app to its own domain. A
      newly registered subdomain fails TLS handshakes for a few minutes while Cloudflare issues
      its certificate.
- [x] **Tell Supabase the URL:** Authentication → URL Configuration. Set the Site URL to the live
      URL, and add it under Redirect URLs as well. Until then, magic links send you to the wrong
      place.
- [x] **Tell the Worker the URL (Claude):** set `APP_URL` in `wrangler.jsonc`, then run
      `npm run gen:worker-types`. Only the cron uses it, for the "Restock in the app" link in
      emails.

## 5. Worker secrets and email

- [x] **Service key, recommended even without email:** `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY`
      (the same `sb_secret_…` key). Without it, the cron can't send alerts or delete stale
      anonymous guests.
- [ ] **Optional, low-stock and new-guest emails:** in Maileroo, verify a domain you own and
      create an API key. Then run `npx wrangler secret put MAILEROO_API_KEY` and set
      `ALERT_FROM_EMAIL` in `wrangler.jsonc` (for example `"Home Bar <bar@yourdomain.com>"`).
      Without them the app still works fully, and the owner still sees the in-app low-stock
      banner.
- [x] **Redeploy:** `npm run deploy:manual:web`, so the new `vars` go live. Secrets apply as soon
      as you set them, and they survive deploys.

## 6. Auto-deploy from GitHub (optional)

- [x] **API token:** in the Cloudflare dashboard, go to My Profile → API Tokens → Create Token and
      use the "Edit Cloudflare Workers" template. Then run `gh secret set CLOUDFLARE_API_TOKEN`
      and paste the token.
- [x] **Account ID:** `npx wrangler whoami` shows it. Run
      `gh variable set CLOUDFLARE_ACCOUNT_ID --body <id>`.
- [x] **Commit and push** the `wrangler.jsonc` changes to `main`. From then on, every push to
      `main` lints, tests, builds and deploys. Migrations never run from CI: after adding one,
      run `npm run push:prod` by hand.

## 7. Custom domain

- [x] **Serve at `pour-decisions.hunt27.com` (Claude).** In `wrangler.jsonc`, add the hostname
      to `routes` with `custom_domain: true`, set `workers_dev: false` and point `APP_URL` at it,
      then run `npm run gen:worker-types`. You don't add DNS records: the deploy creates the record
      and certificate in the hunt27.com zone, which must be in the same Cloudflare account.
- [x] **First deploy from your machine:** `npm run deploy:manual:web`. Wrangler's login can
      create the domain, but the GitHub token might not. If a GitHub deploy failed partway, the
      app could end up offline at both addresses.
- [x] **Update Supabase:** under Authentication → URL Configuration, set the Site URL to
      `https://pour-decisions.hunt27.com`, and replace the workers.dev entry in Redirect URLs.
- [x] **Sign in again** at the new address. Sign-ins don't carry over from the old one.
- If the name doesn't resolve on a device that looked it up before the record existed, that
  device has cached the "no such name" answer. On a Mac, clear it with
  `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`.

## 8. Smoke test

- [x] **Owner:** on the live site, open the Owner tab and enter your email. The magic link should
      land you signed in, with the Manage tab showing.
- [ ] **Stock the shelf:** add a few capsules from the catalog on Manage, with counts.
- [ ] **Guest:** open Manage → Guest link and scan the QR code with another phone, or open the
      link in a private window. Join with a name, take a capsule, and check that the count drops
      on the owner's screen without a refresh. Undo works for 5 minutes.
- [ ] **Low stock:** take one until a capsule hits the threshold. The banner appears, and if
      email is set up, the alert arrives. The cron retries anything missed every 30 minutes.
- [ ] **Home screen:** on your phone, use Share → Add to Home Screen to install it as an app.
