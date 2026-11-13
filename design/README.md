# Handoff: Home Bar Stock (Bartesian capsule tracker)

## Overview
A mobile-first web app for tracking the owner's Bartesian cocktail-capsule inventory. Guests sign in with a name and a shared house code, browse the capsules in stock (photo and quantity), filter by base spirit, and "take one", which takes one off the count. The owner signs in separately and can restock, edit counts, add new capsules from the Bartesian catalog, and get low-stock alerts. There is an activity log of every capsule taken and every restock.

Only direction **1a ("Speakeasy")** is in scope: amber on smoked-oak dark, Cormorant Garamond plus Figtree. Its Bar-screen header and filter row were swapped for the centered "Cabinet" header and underlined text tabs from direction 1b. Directions 1b and 1c in the reference file are not part of the build.

## About the design files
The files in this bundle are **design references built in HTML**. They are prototypes that show the intended look and behavior, not production code to copy. The task is to **recreate the 1a design in the target codebase**. The intended stack matches the owner's existing `lo30-react-supabase` project: **React 19 + Vite + TypeScript + Supabase (Auth, Postgres, Realtime) + @tanstack/react-query + react-router-dom v7, deployed to Cloudflare via wrangler**. It can be a new repo built on the same conventions; it does not have to live inside the hockey app.

The lo30 project uses MUI v7. This design has a strong custom look, so either theme MUI heavily (palette, typography, shape) or build these screens with plain styled components or emotion. Match the visuals here exactly; don't fall back to MUI defaults.

## Fidelity
**High fidelity.** Colors, type, spacing, radii and copy are final. Recreate them pixel-accurately at a 390px-wide viewport. On wider screens, center the app column at `max-width: 480px` on the same background color; no desktop layout is needed.

## Data model (Supabase)
Suggested schema, which mirrors the prototype state:

```sql
-- Catalog, seeded from capsules.json (55 Bartesian single cocktails)
create table capsules (
  id text primary key,            -- Bartesian product handle, e.g. 'old-fashioned-cocktails'
  name text not null,             -- 'Old Fashioned'
  spirit text not null check (spirit in ('vodka','tequila','whiskey','rum','gin','multi')),
  img_box text not null,          -- Shopify CDN url: box + capsule + drink composite
  img_pour text not null,         -- Shopify CDN url: drink only
  description text
);

-- What the owner has. A row exists once the capsule has been added to the bar.
create table stock (
  capsule_id text primary key references capsules(id),
  qty int not null default 0 check (qty >= 0),
  updated_at timestamptz default now()
);

create table activity (
  id uuid primary key default gen_random_uuid(),
  capsule_id text references capsules(id),
  actor_name text not null,       -- guest's typed name, or owner's name
  kind text not null check (kind in ('take','restock','add')),
  amount int not null,            -- 1 for take, 8 for a box
  created_at timestamptz default now()
);

create table settings (            -- single row
  id int primary key default 1,
  low_threshold int not null default 2,
  house_code text not null        -- hash this or check it in an edge function; never expose to the client
);
```

- **Taking a capsule must be atomic.** Use a Postgres function, `take_capsule(capsule_id, actor_name)`, that does `update stock set qty = qty - 1 where capsule_id = $1 and qty > 0 returning qty` and inserts the activity row in the same transaction. If no row was updated, return an error ("someone just took the last one").
- **Undo** calls `undo_take(activity_id)`, which adds 1 back and deletes the log row. Only allow it within about 5 minutes and for the same actor.
- **Auth:**
  - **Owner:** Supabase email magic link. The owner role is checked with a fixed `owner_user_id` or an `is_owner` claim.
  - **Guests:** name plus a 4-digit house code. Verify the code in an edge function. On success, either mint an anonymous Supabase session (`signInAnonymously`) with `guest_name` in user metadata, or set a signed cookie. Guests may only call `take_capsule` and read `capsules`, `stock` and `activity`. RLS should block guest writes to `stock` and `settings`.
- **Realtime:** subscribe to `stock` and `activity` so counts update live when several guests use the app at once.
- **Low-stock alert:** when `take_capsule` drops qty to `<= low_threshold`, notify the owner. The lo30 repo already uses Resend for email, or use web push. The prototype only shows this as a pill on the confirmation screen and a banner for the owner.

## Screens

The layout frame is a 390×844 reference. Screen padding is `56px 20px 28px` (top accounts for the status bar). Screens with tabs reserve a 72px bottom nav.

### 1. Sign in
- **Purpose:** guest or owner entry.
- **Layout:** column, padding `72px 28px 36px`, gap 26. The form block is pinned to the bottom (`margin-top:auto`).
- **Eyebrow:** "THE HOME BAR", Figtree 12/600, letter-spacing .28em, uppercase, amber.
- **Headline:** "What are we *pouring* tonight?", Cormorant Garamond 54/500, line-height .95, letter-spacing -.01em. "pouring" is italic and amber.
- **Preview strip:** 3 capsule tiles, 104×104, radius 20, tile background. Images use `object-fit:contain`, `mix-blend-mode:multiply`, padding 6.
- **Segmented control (Guest | Owner):** surface background, radius 14, padding 4, gap 4, two equal columns. Each button is 40 high, radius 11, 14/600. The active option is amber with amberInk text; the inactive one is transparent with text color.
- **Guest form:**
  - Inputs "Your name" and "House code": 54 high, surface background, 1px border, radius 14, padding 0 16, 16px text. The code input uses `inputmode=numeric`, `maxlength=4`, letter-spacing .3em, digits only.
  - Error line: 14px in the low color. "Tell us your name first" / "That code isn't right".
  - Primary button "Enter the bar": 56 high, radius 16, amber background, amberInk text, 16/700.
  - Hint "Ask the host for the house code": 13px muted, centered. Remove the "· demo 1234" from the prototype.
- **Owner form:** email input, then "Send sign-in link" (same primary style), then the hint "Owners can restock, edit and get low-stock alerts".

### 2. Bar (home, stock list)
- **Header** (centered column, gap 6, padding-bottom 18, 1px bottom border):
  - Eyebrow "TONIGHT'S POUR LIST": 11/700, letter-spacing .32em, amber.
  - Title "{ownerName}'s Cabinet": Cormorant 46/500, line-height 1.
  - Subline "{N} capsules, {M} cocktails": Cormorant italic 19, textSoft.
  - Avatar button, top-right (absolute, top -8): 40px circle, surface background, 1px border, the user's initial in Cormorant 20/600 amber. Tapping it signs out (in production, open a small menu).
- **Low-stock banner** (owner only, when any item is `<= threshold` or 0): full-width button, padding 14 16, radius 16, lowBg background, 1px lowBorder.
  - Left: "{n} running low" (15/600) above up to 3 names, comma-separated (13px, lowSoft).
  - Right: "Restock →" (14/600 amber). Opens Manage.
- **Spirit filter tabs:** a horizontal scroll row that bleeds to the screen edge (`margin:0 -20px; padding:0 20px`), gap 20, `flex:none` (important: without it, the row collapses inside the scroll column). Each tab is a text button: 15/700, letter-spacing .02em, padding 6 0 8, min-height 44, with a 2px bottom border. Active: amber text and amber border. Inactive: muted text and transparent border. Tabs are All · Vodka · Tequila · Whiskey · Rum · Gin · Mixed. **Hide a spirit tab when there are 0 capsules of that spirit in view.**
- **Toolbar row:**
  - Left: the filter title in Cormorant italic 22/500. "Everything in stock" for guests, "Whole shelf" for the owner, or "{Spirit} cocktails".
  - Right: grid/list toggle on surface, radius 12, padding 3. Each button is 40×34, radius 9. The active one gets a border-color background with an amber icon; inactive icons are muted. The grid icon is a 2×2 of 6px squares; the list icon is 3 bars of 14×2.5.
- **Grid view:** 2 columns, gap 18 (row) and 14 (column).
  - **Card:** a full tap target that opens Detail.
  - **Tile:** square, radius 20, tile background. Image padding 8, multiply blend.
  - **Quantity pill** (top-right, 10px inset): "×6", 13/700, padding 4 9, radius 999, amberInk text. Background is amber normally, the low color when low, outPill when out (text "Out").
  - Below the tile: name in Cormorant 20/600, line-height 1.05. Then the spirit in 11/600, uppercase, letter-spacing .14em; it reads "Vodka · low" in the low color when low.
- **List view:**
  - Row: padding 10 0, 1px divider bottom, gap 14.
  - Contents, left to right: a 64×64 tile (radius 14); name (Cormorant 20/600) over "{Spirit} · {n} left" (13px; low color when low); the qty number (Cormorant 26/600 amber); a "Take" pill.
  - The "Take" pill is 44 high, padding 0 16, 1px amber border, amber text, 14/600. It opens the confirmation sheet directly without going to Detail. It is disabled and greyed when the item is out.
- **Sort order:** in-stock items first, then alphabetical. Guests don't see 0-qty items (configurable). The owner sees them at 50% opacity at the end.
- **Empty state:** "Nothing on the shelf here yet." 15px muted, centered.

### 3. Capsule detail
- **Top bar:** a 44px circular back button (←) on surface with a border. On the right, a segmented "Box | Pour" toggle (radius 999, buttons 34 high, 13/600) that swaps the hero image between `img_box` and `img_pour`.
- **Hero:** square, margin 0 20, radius 28, tile background, image padding 14, multiply.
- **Content** (padding 22 20 0, gap 10):
  - Spirit eyebrow: 12/600, .2em, amber.
  - Name: Cormorant 42/500.
  - Status line, 15/600: "6 in the bar" (muted), "Running low · 2 left" (low color), or "Out of stock".
  - Description: 15px, line-height 1.6, textSoft.
- **Owner only, shelf-count card:** surface background, 1px border, radius 18, padding 14 16. Layout: "Shelf count" label, a − button, qty (Cormorant 26/600), a + button, and a "+8 box" pill. The − and + buttons are 40px circles with the stepperBorder color. The "+8 box" pill uses the boxBtn background with amber 13/700 text.
- **Sticky footer:** bg color, 1px top divider, padding 14 20 30.
  - When in stock: "Take one", 58 high, radius 18, amber background, 17/700. It opens the sheet.
  - When out: a non-interactive surface block, "Out of stock · ask {owner} to restock".

### 4. Checkout confirmation (bottom sheet)
- **Scrim:** `rgba(8,5,2,.62)`. Tapping it closes the sheet.
- **Sheet:** surface background, radius 30 30 0 0, 1px top border, padding 12 20 32, gap 18. Grabber 40×5.
- **Content:**
  - 84px tile (radius 18).
  - "Take one {name}?" in Cormorant 28/500, with "Leaves {n−1} in the bar" below in 14px textSoft.
- **Buttons:** a grid of 1fr and 1.6fr, gap 10, both 56 high and radius 16. "Cancel" is outlined; "Yes, pour it" is amber.
- **Animation (not in the prototype, recommended):** sheet slides up over 220ms with `cubic-bezier(.2,.8,.2,1)`; scrim fades over 180ms.

### 5. Checkout done
- **Layout:** centered column, gap 18, padding 40 28.
- **Content:**
  - A 230px circle in the tile color with the **pour** image (padding 22, multiply).
  - "Cheers, {name}." in Cormorant italic 50/500.
  - "One {cocktail} checked out · {n} left" in 16px textSoft.
- **If now low or out:** a pill reading "Running low · {owner} has been notified". Padding 8 14, radius 999, lowBg background, lowSoft text, 14px.
- **Buttons:** "Back to the bar" (primary, 58 high), then an "Undo" text button (48 high, muted 15/600).

### 6. Activity
- **Header:** title "Activity" (Cormorant 46/500), subtitle "Every pour and restock" (14 muted).
- **Groups:** Today / Yesterday / Earlier. The label is 12/600, .2em uppercase, muted.
- **Row:**
  - A 46px tile (radius 12).
  - "**Jess** took a Margarita", "**Sam** restocked Lemon Drop", or "**Sam** added Caramel Appletini", at 15px; the name is bold.
  - Time at 13 muted: under 1 hour shows "38m ago"; today or yesterday shows "9:42 PM"; older shows "Tue · 9:42 PM".
  - Amount on the right in Cormorant 22/600: "−1" (muted) or "+8" (amber).
- Visible to everyone.

### 7. Manage (owner only)
- **Header:** "Manage" title with the subtitle "Restock, edit counts, set alerts". On the right, a "+ Add capsule" pill: 42 high, amber, 14/700.
- **Low-stock alert card** (surface, border, radius 18, padding 16):
  - "Low-stock alert" (15/600), "Notify me at {n} or fewer" (13 muted).
  - A − {n} + stepper, clamped to 1–8.
- **Running low section:** label "RUNNING LOW · n" in the low color. Each row has a tile, the name, "Only 2 left" or "Out" (low color), and a "+8 box" outline pill.
- **Shelf section:** label "SHELF · n COCKTAILS". Each row has a tile, the name, the spirit, and a − qty + stepper (38px circles). Tapping the tile or name opens Detail.
- **Logging:** a "+8 box" or add writes an activity row. Single +1/−1 corrections do **not** log.

### 8. Add a capsule (owner only)
- **Header:** back button and "Add a capsule" (Cormorant 34/500).
- **Search input:** placeholder "Search the Bartesian catalog". Filters by name or spirit.
- **Row:**
  - A 52px tile, the name, and "{Spirit} · {n} on shelf" or "Not in bar".
  - A "+8 box" pill. It is filled amber if the capsule is not yet in the bar, outlined if it is.
  - Tapping it adds 8 (upserts the stock row) and logs `add` or `restock`.

### Bottom nav (Bar / Activity / Manage)
- 72 high, bg color, 1px top divider. Manage appears for the owner only.
- **Item:** an 18×3 indicator bar above a 13/600 label. Active: amber bar and amber label. Inactive: transparent bar and muted label.
- Hidden on Sign in, Detail, Done, Add, and while the sheet is open.

## Design tokens

| Token | Hex | oklch |
|---|---|---|
| bg | `#130e0a` | 0.17 0.012 60 |
| surface | `#1e1813` | 0.215 0.014 60 |
| border | `#342c26` | 0.30 0.015 60 |
| divider | `#29231d` | 0.26 0.014 60 |
| stepperBorder | `#433b35` | 0.36 0.015 60 |
| text | `#f3eee6` | 0.95 0.012 80 |
| textSoft | `#c5bcb2` | 0.80 0.018 70 |
| muted | `#b3a99e` | 0.74 0.02 70 |
| amber (accent) | `#edb161` | 0.80 0.12 72 |
| amberInk (text on amber) | `#1d140d` | 0.20 0.02 60 |
| low | `#f08d6a` | 0.74 0.13 40 |
| lowBg | `#321b13` | 0.25 0.04 40 |
| lowBorder | `#7f422d` | 0.45 0.09 40 |
| lowSoft | `#e4c7b7` | 0.85 0.04 50 |
| outPill | `#4e4640` | 0.40 0.015 60 |
| tile (image bg) | `#eee7db` | 0.93 0.018 80 |
| boxBtn | `#382b1d` | 0.30 0.03 70 |

- **Fonts (Google Fonts):**
  - **Cormorant Garamond** 500/600, regular and italic: display, names, numbers.
  - **Figtree** 400–700: UI and body.
- **Type scale:** 54 / 50 / 46 / 42 / 34 / 28 / 26 / 22 / 20 / 19 / 17 / 16 / 15 / 14 / 13 / 12 / 11.
- **Radii:** 9, 11, 12, 14, 16, 18, 20, 28, 30 (sheet), 999 (pills), 50% (circles).
- **Spacing:** 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 26, 28. The screen gutter is 20 (28 on Sign in).
- **Hit targets:** 40px minimum, 44px or more preferred.
- **Image treatment:** the Bartesian photos are on white. Always place them on the **tile** color with `mix-blend-mode: multiply` and `object-fit: contain`, so the white drops out into warm cream.

## Assets
- `capsules.json`: 55 single-cocktail capsules pulled from Bartesian's public Shopify catalog (`https://bartesian.com/products.json`). Variety packs, collections and the advent calendar are excluded. Fields: `id` (handle), `name`, `spirit` (vodka/tequila/whiskey/rum/gin/multi), `img` (box shot), `img2` (pour shot), `desc`. Use it to seed `capsules`.
- Images are hotlinked from `cdn.shopify.com`. Append `&width=360` for thumbnails and `&width=800` for the hero. For production, copy them into Supabase Storage (or R2) so the app doesn't depend on Bartesian's CDN. They are Bartesian's product photos; keep the app personal or non-commercial.
- No icons beyond the simple CSS glyphs described above (← arrow, grid, list). Swap in `react-icons` if preferred.

## Prototype seed data (for local testing)
The starting stock is in `START` in the reference file's logic. Examples: Old Fashioned 6, Margarita 4, Espresso Martini 2, Manhattan 1, Bee's Knees 1, Rum Breeze 0, Pineapple Margarita 0, Lemon Drop 7. The owner name defaults to "Sam" and the house code to "1234". All of these are props in the prototype and should come from settings in the real app.

## Screenshots
These are 2× captures at the 390×844 reference size, in `screenshots/`:
- `01-sign-in-guest.png`: Sign in, Guest tab, filled in
- `02-bar-grid-guest.png`: Bar, grid view, as a guest
- `03-bar-list-filtered.png`: Bar, list view, Whiskey filter, with quick-Take buttons
- `04-detail-guest.png`: Capsule detail as a guest
- `05-checkout-confirm.png`: Confirmation bottom sheet
- `06-checkout-done.png`: Cheers screen with Undo
- `07-activity.png`: Activity log
- `08-bar-owner-low-stock.png`: Bar as the owner, with the low-stock banner and the Manage tab
- `09-detail-owner.png`: Detail as the owner, with the shelf-count stepper and the running-low status
- `10-manage.png`: Manage, with the alert threshold and the running-low list
- `11-add-capsule.png`: Add a capsule from the catalog

Note: all numerals use `font-variant-numeric: lining-nums`. Cormorant's default old-style figures make a "1" look like an "I".

## Files
- `Home Bar Stock.dc.html`: the design reference. Artboard **1a** is the full clickable prototype, and all its markup and inline styles are the source of truth. The logic class at the bottom of the file holds the state machine (screens: `login → bar ⇄ detail → sheet → done`, plus `activity`, `manage`, `add`). 1b and 1c are alternate explorations; ignore them except for the header and tabs already merged into 1a.
- `capsules.json`: the catalog seed.
- `support.js`: runtime needed only to open the HTML reference in a browser. Not part of the build.
