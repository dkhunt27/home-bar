// Low-stock emails to the owner. take_capsule() queues a row in low_stock_alerts when a pour
// leaves a capsule running low or empty; this claims the queue and sends one email for
// whatever is still low. Two triggers, same code:
//
// - POST /api/low-stock/notify, which the app fires right after such a pour
//   (src/lib/low-stock-api.ts). No auth and no input: it can only send alerts the database
//   already queued, each one once, so there's nothing for a caller to abuse.
// - The cron in wrangler.jsonc, every 30 minutes, for anything the app's call missed.
//
// Without the email settings (worker/mail.ts) this reports "not configured" and leaves the
// queue alone; the owner still sees the in-app banner either way.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database.gen.ts";
import {
  escapeHtml,
  type FlushResult,
  missingMailConfig,
  sendEmail,
  serviceClient,
  type WorkerEnv,
} from "./mail.ts";

interface ClaimedAlerts {
  alert_ids: string[];
  to: string | null;
  bar_name: string;
  owner_name: string;
  items: { name: string; qty: number }[];
}

export async function flushLowStockAlerts(env: WorkerEnv, appUrl?: string): Promise<FlushResult> {
  const missing = missingMailConfig(env);
  if (missing.length > 0) return { status: "not_configured", missing };

  const supabase = serviceClient(env);
  const { data, error } = await supabase.rpc("claim_low_stock_alerts");
  if (error) return { status: "failed", error: `claim: ${error.message}` };
  const claimed = data as unknown as ClaimedAlerts;
  if (claimed.alert_ids.length === 0) return { status: "nothing_to_send" };
  // Restocked since the alert was queued: claimed, nothing to say.
  if (claimed.items.length === 0) return { status: "nothing_to_send" };
  if (!claimed.to) {
    await release(supabase, claimed.alert_ids);
    return { status: "failed", error: "settings_private.owner_email is not set" };
  }

  const sendError = await sendEmail(env, {
    to: claimed.to,
    subject: subjectFor(claimed.items),
    html: htmlFor(claimed, appUrl),
    plain: textFor(claimed, appUrl),
  });
  if (sendError) {
    await release(supabase, claimed.alert_ids);
    return { status: "failed", error: sendError };
  }
  return { status: "sent", items: claimed.items.length };
}

async function release(supabase: SupabaseClient<Database>, ids: string[]) {
  const { error } = await supabase.rpc("release_low_stock_alerts", { p_ids: ids });
  if (error) console.error("low-stock: release failed", error);
}

function describe(item: { name: string; qty: number }): string {
  return item.qty === 0 ? `${item.name}: out` : `${item.name}: ${item.qty} left`;
}

function subjectFor(items: ClaimedAlerts["items"]): string {
  if (items.length === 1) {
    const [only] = items;
    return only.qty === 0 ? `Out of ${only.name}` : `Running low on ${only.name}`;
  }
  return `${items.length} capsules running low`;
}

function textFor(claimed: ClaimedAlerts, appUrl?: string): string {
  return [
    `Running low at ${claimed.bar_name}:`,
    "",
    ...claimed.items.map((i) => `- ${describe(i)}`),
    ...(appUrl ? ["", `Restock: ${appUrl}/manage`] : []),
  ].join("\n");
}

function htmlFor(claimed: ClaimedAlerts, appUrl?: string): string {
  const rows = claimed.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;font-size:16px">${escapeHtml(i.name)}</td>` +
        `<td style="padding:6px 0 6px 16px;font-size:16px;text-align:right;color:${i.qty === 0 ? "#b4532f" : "#1d140d"}">` +
        `${i.qty === 0 ? "Out" : `${i.qty} left`}</td></tr>`,
    )
    .join("");
  const link = appUrl
    ? `<p style="margin:20px 0 0"><a href="${escapeHtml(appUrl)}/manage" style="color:#9a6420;font-weight:600">Restock in the app →</a></p>`
    : "";
  return (
    `<div style="font-family:system-ui,sans-serif;color:#1d140d;max-width:420px">` +
    `<p style="margin:0 0 12px;font-size:15px">Running low at ${escapeHtml(claimed.bar_name)}:</p>` +
    `<table style="border-collapse:collapse">${rows}</table>${link}</div>`
  );
}
