#!/usr/bin/env node
// Production build: `npm run build` (typecheck + vite build) against the Supabase project in
// wrangler.jsonc `vars` (tools/wrangler-vars.mjs), overriding any .env file, so a prod build
// can never bake in the local database by accident.
//
// Usage: .github/workflows/deploy-prod.yml runs this, as does `npm run deploy:manual:web`.

import { spawnSync } from "node:child_process";
import { supabaseVars } from "./wrangler-vars.mjs";

let supabase;
try {
  supabase = supabaseVars();
} catch (err) {
  console.error(`build-prod: ${err.message}`);
  process.exit(1);
}

console.log(`build-prod: against ${new URL(supabase.VITE_SUPABASE_URL).hostname}`);
const result = spawnSync("npm", ["run", "build"], {
  stdio: "inherit",
  env: { ...process.env, ...supabase },
});
process.exit(result.status ?? 1);
