// What the Worker's emails to the owner share (worker/low-stock.ts, worker/guest-joins.ts):
// the service-role client that claims an outbox, and sending through Maileroo.
//
// Needs SUPABASE_SERVICE_ROLE_KEY and MAILEROO_API_KEY as Worker secrets, and
// ALERT_FROM_EMAIL on a domain verified in Maileroo. Without them a flush reports "not
// configured" and leaves its outbox alone.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database.gen.ts";

/** Env with the two secrets optional. `wrangler types` only lists them if your local .env
 * happens to set them, and in a deploy they may genuinely be missing. */
export type WorkerEnv = Omit<Env, "SUPABASE_SERVICE_ROLE_KEY" | "MAILEROO_API_KEY"> & {
  SUPABASE_SERVICE_ROLE_KEY?: string;
  MAILEROO_API_KEY?: string;
};

export type FlushResult =
  | { status: "not_configured"; missing: string[] }
  | { status: "nothing_to_send" }
  | { status: "sent"; items: number }
  | { status: "failed"; error: string };

const MAILEROO_SEND_URL = "https://smtp.maileroo.com/api/v2/emails";

interface MailerooAddress {
  address: string;
  display_name?: string;
}

interface MailerooResponse {
  success: boolean;
  message: string;
  data?: { reference_id: string };
}

/** What an email needs that this env doesn't have; empty when it can send. */
export function missingMailConfig(env: WorkerEnv): string[] {
  return [
    !env.VITE_SUPABASE_URL && "VITE_SUPABASE_URL",
    !env.SUPABASE_SERVICE_ROLE_KEY && "SUPABASE_SERVICE_ROLE_KEY",
    !env.MAILEROO_API_KEY && "MAILEROO_API_KEY",
    !env.ALERT_FROM_EMAIL && "ALERT_FROM_EMAIL",
  ].filter((m): m is string => !!m);
}

/** Bypasses RLS. Check SUPABASE_SERVICE_ROLE_KEY is set first. */
export function serviceClient(env: WorkerEnv): SupabaseClient<Database> {
  return createClient<Database>(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY as string, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface Email {
  to: string;
  subject: string;
  html: string;
  plain: string;
}

/** Null once Maileroo has accepted it, otherwise what went wrong. */
export async function sendEmail(env: WorkerEnv, email: Email): Promise<string | null> {
  const res = await fetch(MAILEROO_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.MAILEROO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: parseAddress(env.ALERT_FROM_EMAIL),
      to: [{ address: email.to }],
      subject: email.subject,
      html: email.html,
      plain: email.plain,
      // A note to yourself: no open pixel, and links stay plain links.
      tracking: false,
    }),
  });
  // Maileroo can answer 200 with success: false, so both have to check out.
  const result = (await res.json().catch(() => null)) as MailerooResponse | null;
  if (!res.ok || !result?.success) {
    return `maileroo ${res.status}: ${result?.message ?? "no body"}`;
  }
  return null;
}

/** Accepts `addr@x.com` or `Display Name <addr@x.com>`, Maileroo wants them split. */
function parseAddress(raw: string): MailerooAddress {
  const match = raw.trim().match(/^(.*)<([^>]+)>$/);
  if (!match) return { address: raw.trim() };
  const name = match[1].trim().replace(/^"|"$/g, "");
  return name ? { address: match[2].trim(), display_name: name } : { address: match[2].trim() };
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
