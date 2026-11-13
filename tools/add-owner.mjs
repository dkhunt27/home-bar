#!/usr/bin/env node
// Makes someone the bar's owner on the hosted project: creates their auth user, already
// confirmed (magic links only go to existing users), and sets settings_private.owner_email.
// Safe to re-run: an existing user is left as it is. Running it with a different email
// moves ownership to that address.
//
// Usage:
//   SUPABASE_SERVICE_ROLE_KEY=<secret key> npm run add-owner -- you@example.com
//
// The key is the project's secret key (Dashboard → Project Settings → API Keys). It's read
// from the environment only, never .env, whose key is the local stack's. Targets the project
// in wrangler.jsonc `vars` (tools/wrangler-vars.mjs); set SUPABASE_URL to aim elsewhere,
// e.g. http://127.0.0.1:55321 for the local stack.

import { createClient } from "@supabase/supabase-js";
import { supabaseVars } from "./wrangler-vars.mjs";

function fail(message) {
  console.error(`add-owner: ${message}`);
  process.exit(1);
}

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
  fail("usage: SUPABASE_SERVICE_ROLE_KEY=<secret key> npm run add-owner -- you@example.com");
}

const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) fail("set SUPABASE_SERVICE_ROLE_KEY (Dashboard → Project Settings → API Keys)");

let url = process.env.SUPABASE_URL;
if (!url) {
  try {
    url = supabaseVars().VITE_SUPABASE_URL;
  } catch (err) {
    fail(err.message);
  }
}

console.log(`add-owner: ${email} on ${new URL(url).host}`);
const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { error: createError } = await supabase.auth.admin.createUser({
  email,
  email_confirm: true,
});
if (createError && createError.code !== "email_exists") {
  fail(`couldn't create the user: ${createError.message}`);
}
console.log(createError ? "  user already exists, left as it is" : "  created the user");

const { data, error } = await supabase
  .from("settings_private")
  .update({ owner_email: email })
  .eq("id", 1)
  .select("id");
if (error) fail(`couldn't set owner_email: ${error.message}`);
if (data.length === 0) fail("settings_private has no row. Has `npm run push:prod` run?");
console.log("  set settings_private.owner_email");

console.log(`Done. Sign in on the Owner tab with ${email}.`);
