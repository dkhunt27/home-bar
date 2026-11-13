// The stock functions RAISE short codes ('out_of_stock', 'undo_expired', ...; see
// supabase/migrations/010_take_capsule.sql and 011_owner_stock.sql). This turns them into the
// sentence a person should see.

const MESSAGES: Record<string, string> = {
  out_of_stock: "Someone just took the last one.",
  not_member: "You've been signed out of the bar. Sign in again.",
  not_owner: "Only the owner can do that.",
  not_in_bar: "That capsule isn't on the shelf yet.",
  undo_expired: "Too late to undo. It's been more than 5 minutes.",
  undo_not_allowed: "That pour can't be undone.",
};

export function friendlyError(err: unknown): string {
  const message = err instanceof Error ? err.message : (err as { message?: string })?.message;
  if (message && message in MESSAGES) return MESSAGES[message];
  if (typeof navigator !== "undefined" && !navigator.onLine) return "You're offline.";
  return "Something went wrong. Try again.";
}
