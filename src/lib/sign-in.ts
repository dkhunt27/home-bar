// Owner sign-in rules: the emailed code and passkeys (Face ID). An iPhone opens an email link
// in the browser, never the home-screen app, so the app signs in with the code or a passkey.

import { friendlyError } from "./errors";

/** The hosted project sends 8 digits and local Supabase 6; take anything in that range. */
const CODE_LENGTH = { min: 6, max: 10 } as const;

export const CODE_MAX_LENGTH = CODE_LENGTH.max;

/** What the code field keeps from typing or pasting: digits only, at most the longest code. */
export function cleanCode(input: string): string {
  return input.replace(/\D/g, "").slice(0, CODE_LENGTH.max);
}

export function isFullCode(code: string): boolean {
  return code.length >= CODE_LENGTH.min && code.length <= CODE_LENGTH.max;
}

/** What the phone calls its passkey prompt. Everything but an iPhone gets the generic word. */
export function passkeyName(userAgent: string): "Face ID" | "passkey" {
  return /iPhone|iPod/.test(userAgent) ? "Face ID" : "passkey";
}

export function passkeysSupported(): boolean {
  return typeof window !== "undefined" && "PublicKeyCredential" in window;
}

/**
 * True when the person backed out of the Face ID or passkey sheet (or a newer ceremony
 * replaced it), which needs no error message. Browsers report cancelling as NotAllowedError,
 * and supabase-js wraps it with the original as `cause`.
 */
export function isPasskeyCancel(err: unknown): boolean {
  const e = err as { code?: string; name?: string; cause?: { name?: string } } | null;
  if (!e) return false;
  if (e.code === "ERROR_CEREMONY_ABORTED") return true;
  const name = e.cause?.name ?? e.name;
  return name === "NotAllowedError" || name === "AbortError";
}

/** What to say when signing in with a passkey or saving one fails; null when they backed out. */
export function passkeyErrorMessage(err: unknown): string | null {
  if (isPasskeyCancel(err)) return null;
  const code = (err as { code?: string } | null)?.code;
  // The hosted project's Authentication settings switch passkeys on (see CLAUDE.md).
  if (code === "passkey_disabled") return "Passkey sign-in isn't switched on yet.";
  if (code === "webauthn_challenge_expired") return "That took too long. Try again.";
  if (code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED") return "This device already has one.";
  if (code === "over_request_rate_limit") return "Too many tries. Give it a few minutes.";
  return friendlyError(err);
}
