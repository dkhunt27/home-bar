export const ROUTES = {
  SIGN_IN: "/sign-in",

  BAR: "/",
  /** One capsule: photo, status, Take one. The owner also gets the shelf-count card. */
  CAPSULE: "/capsule",
  /** "Cheers, Jess." after a pour, with Undo. Needs CheersState in location.state. */
  CHEERS: "/cheers",
  ACTIVITY: "/activity",

  MANAGE: "/manage",
  MANAGE_ADD: "/manage/add",
  /** The QR code guests scan to join, plus Share / Copy and "Make a new link". */
  MANAGE_GUEST_LINK: "/manage/guest-link",
  /** Owner only: every box on the shelf, soonest best-by first. */
  MANAGE_EXPIRING: "/manage/expiring",
} as const;

export const capsuleRoute = (capsuleId: string) => `${ROUTES.CAPSULE}/${capsuleId}`;

/** Add a capsule, on its Collections list, searched for one cocktail: where the "+ box" for a
 * collection-only cocktail (Frosty Navel) goes, since there's no box of 8 of it. */
export const collectionsForRoute = (capsuleName: string) =>
  `${ROUTES.MANAGE_ADD}?${new URLSearchParams({ view: "collections", q: capsuleName })}`;

/** What the take flow hands the Cheers screen. */
export interface CheersState {
  activityId: string;
  capsuleId: string;
  qty: number;
  isLow: boolean;
}
