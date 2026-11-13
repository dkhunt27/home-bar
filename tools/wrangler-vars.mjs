// Reads the Supabase values out of wrangler.jsonc's `vars` for the build. The Worker reads the
// same values at runtime, so building the SPA from them keeps its baked-in copy and the
// Worker's copy from drifting apart.

import { readFileSync } from "node:fs";
import { parse, printParseErrorCode } from "jsonc-parser";

export function supabaseVars() {
  const raw = readFileSync("wrangler.jsonc", "utf8");
  // JSONC: comments and trailing commas. (TypeScript 7 dropped the JS API this used to borrow.)
  const errors = [];
  const config = parse(raw, errors, { allowTrailingComma: true });
  if (errors.length > 0) {
    const [first] = errors;
    throw new Error(
      `could not parse wrangler.jsonc: ${printParseErrorCode(first.error)} at offset ${first.offset}`,
    );
  }

  const url = config?.vars?.VITE_SUPABASE_URL;
  const key = config?.vars?.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "wrangler.jsonc `vars` needs VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (see README, Deploy)",
    );
  }
  if (/127\.0\.0\.1|localhost/.test(url)) {
    throw new Error(`wrangler.jsonc VITE_SUPABASE_URL points at a local stack (${url}). Refusing.`);
  }
  return { VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: key };
}
