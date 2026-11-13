// Cloudflare Worker in front of the built SPA. One route of its own; everything else falls
// through to the static assets binding untouched:
//
// - POST /api/low-stock/notify: email the owner about queued low-stock alerts
//   (worker/low-stock.ts). Here because the Maileroo and service-role keys stay server-side.
//
// Plus a cron (wrangler.jsonc) that runs the same flush as a backstop, emails the owner about
// new guests (worker/guest-joins.ts), deletes stale anonymous users, and pings Supabase so a
// free-tier project is never idle long enough to get paused before a party.

import { flushGuestJoinAlerts } from "./guest-joins.ts";
import { flushLowStockAlerts } from "./low-stock.ts";
import { type FlushResult, serviceClient, type WorkerEnv } from "./mail.ts";

// `Env` (the ASSETS binding and the vars) comes from worker-configuration.d.ts; regenerate
// with `npm run gen:worker-types` after changing wrangler.jsonc.

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/api/low-stock/notify") return env.ASSETS.fetch(request);

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
    }

    const result = await flushLowStockAlerts(env, url.origin);
    if (result.status === "failed") console.error("low-stock notify failed", result.error);
    const status =
      result.status === "not_configured" ? 503 : result.status === "failed" ? 502 : 200;
    return Response.json(result, { status, headers: { "Cache-Control": "no-store" } });
  },

  async scheduled(_controller: ScheduledController, env: WorkerEnv): Promise<void> {
    const appUrl = env.APP_URL || undefined;
    // Independent jobs: one failing (Maileroo down, say) mustn't skip the rest.
    const jobs = await Promise.allSettled([
      flushLowStockAlerts(env, appUrl).then((r) => logFlush("low-stock", r)),
      flushGuestJoinAlerts(env, appUrl).then((r) => logFlush("guest-joins", r)),
      deleteStaleAnonymousUsers(env),
      keepAlive(env),
    ]);
    for (const job of jobs) {
      if (job.status === "rejected") console.error("cron job threw", job.reason);
    }
  },
} satisfies ExportedHandler<WorkerEnv>;

function logFlush(name: string, result: FlushResult) {
  if (result.status === "failed") console.error(`${name} cron failed`, result.error);
  else if (result.status === "sent") console.log(`${name} cron sent`, result.items);
}

// Bots that signed in and left, people who never finished joining, and guests a new link
// signed out (delete_stale_anonymous_users() in 015_guest_link.sql has the rules).
async function deleteStaleAnonymousUsers(env: WorkerEnv) {
  if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return;
  const { data, error } = await serviceClient(env).rpc("delete_stale_anonymous_users");
  if (error) console.error("anonymous cleanup failed", error.message);
  else if (data > 0) console.log("anonymous cleanup deleted", data);
}

// One cheap anon read. Free Supabase projects pause after a week idle, and a home bar can
// easily go a week between parties.
async function keepAlive(env: WorkerEnv) {
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_PUBLISHABLE_KEY) return;
  const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/settings?select=id`, {
    headers: { apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY },
  });
  if (!res.ok) console.error("supabase keep-alive failed", res.status);
}
