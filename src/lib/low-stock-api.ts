/**
 * Nudges the Worker to email the owner about the alert take_capsule() just queued
 * (worker/low-stock.ts). Fire-and-forget: the endpoint takes no input and only sends what's
 * already in the outbox, and the Worker's cron retries anything this misses, so a failure
 * here is never the guest's problem. `keepalive` lets it finish if they close the tab.
 */
export function notifyLowStock(): void {
  void fetch("/api/low-stock/notify", { method: "POST", keepalive: true }).catch(() => {});
}
