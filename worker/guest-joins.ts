// "New guest" emails to the owner. join_bar() queues a row in guest_join_alerts for each new
// guest; this claims the queue and sends one email naming them, so a stranger who got hold
// of the guest link stands out.
//
// The Worker's 30-minute cron is the only trigger, unlike low stock: a party's worth of
// arrivals comes as one or two emails instead of one each, and half an hour is soon enough
// to make a new link.

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

interface ClaimedJoins {
  alert_ids: string[];
  to: string | null;
  bar_name: string;
  names: string[];
}

export async function flushGuestJoinAlerts(env: WorkerEnv, appUrl?: string): Promise<FlushResult> {
  const missing = missingMailConfig(env);
  if (missing.length > 0) return { status: "not_configured", missing };

  const supabase = serviceClient(env);
  const { data, error } = await supabase.rpc("claim_guest_join_alerts");
  if (error) return { status: "failed", error: `claim: ${error.message}` };
  const claimed = data as unknown as ClaimedJoins;
  if (claimed.alert_ids.length === 0) return { status: "nothing_to_send" };
  if (!claimed.to) {
    await release(supabase, claimed.alert_ids);
    return { status: "failed", error: "settings_private.owner_email is not set" };
  }

  const linkUrl = appUrl ? `${appUrl}/manage/guest-link` : null;
  const sendError = await sendEmail(env, {
    to: claimed.to,
    subject: subjectFor(claimed),
    html: htmlFor(claimed, linkUrl),
    plain: textFor(claimed, linkUrl),
  });
  if (sendError) {
    await release(supabase, claimed.alert_ids);
    return { status: "failed", error: sendError };
  }
  return { status: "sent", items: claimed.names.length };
}

async function release(supabase: SupabaseClient<Database>, ids: string[]) {
  const { error } = await supabase.rpc("release_guest_join_alerts", { p_ids: ids });
  if (error) console.error("guest-joins: release failed", error);
}

const ADVICE =
  "Don't know someone? Make a new guest link. It signs everyone out until they use the new one.";

function subjectFor({ names, bar_name }: ClaimedJoins): string {
  return names.length === 1
    ? `${names[0]} joined ${bar_name}`
    : `${names.length} new guests at ${bar_name}`;
}

function textFor(claimed: ClaimedJoins, linkUrl: string | null): string {
  return [
    `New at ${claimed.bar_name}:`,
    "",
    ...claimed.names.map((n) => `- ${n}`),
    "",
    ADVICE,
    ...(linkUrl ? [linkUrl] : []),
  ].join("\n");
}

function htmlFor(claimed: ClaimedJoins, linkUrl: string | null): string {
  const rows = claimed.names
    .map((n) => `<li style="padding:4px 0;font-size:16px">${escapeHtml(n)}</li>`)
    .join("");
  const link = linkUrl
    ? `<p style="margin:8px 0 0"><a href="${escapeHtml(linkUrl)}" style="color:#9a6420;font-weight:600">Guest link in the app →</a></p>`
    : "";
  return (
    `<div style="font-family:system-ui,sans-serif;color:#1d140d;max-width:420px">` +
    `<p style="margin:0 0 8px;font-size:15px">New at ${escapeHtml(claimed.bar_name)}:</p>` +
    `<ul style="margin:0 0 16px;padding-left:20px">${rows}</ul>` +
    `<p style="margin:0;font-size:14px;color:#5c5047">${ADVICE}</p>${link}</div>`
  );
}
