-- One-time setup for a remote (hosted) project, after `npm run push:prod`. Run it in the
-- Supabase dashboard's SQL editor. Re-run it later to change these settings.
--
-- Fill in your values in the editor only; keep the placeholders in this committed file.
--
-- The owner is set by `npm run add-owner -- you@example.com` instead (tools/add-owner.mjs),
-- which also creates the owner's user: magic links only go to existing users. Then sign in
-- on the Owner tab. The guest link and its QR code are on Manage → Guest link.

UPDATE settings
SET owner_name = 'Sam',          -- "{owner_name}'s Cabinet"
    bar_name = 'The Home Bar',   -- sign-in screen eyebrow
    low_threshold = 2            -- also editable on the Manage screen
WHERE id = 1;
