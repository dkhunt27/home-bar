import { type FormEvent, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { CapsuleTile } from "../components/capsule-tile";
import { Loading } from "../components/loading";
import { Segmented } from "../components/segmented";
import ui from "../components/ui.module.css";
import { useAuth } from "../hooks/use-auth";
import { useCapsules, useSettings } from "../hooks/use-bar-data";
import { joinKeyFromHash } from "../lib/bar";
import { cx } from "../lib/cx";
import { friendlyError } from "../lib/errors";
import { IMAGE_WIDTH, sizedImage } from "../lib/images";
import { ROUTES } from "../routes";
import type { JoinBarStatusType } from "../types";
import styles from "./sign-in-page.module.css";

type Tab = "guest" | "owner";

const PREVIEW_IDS = ["old-fashioned-cocktails", "margarita-cocktails", "espresso-martini-capsules"];

const JOIN_ERRORS: Record<Exclude<JoinBarStatusType, "ok">, string> = {
  no_name: "Tell us your name first",
  // The owner made a new link since this one was shared.
  bad_key: "This link has expired. Ask the host for the new one.",
  not_configured: "The bar isn't open yet. Ask the host.",
  not_signed_in: "Something went wrong. Try again.",
};

/** Supabase auth errors worth explaining; anything else falls back to friendlyError. */
function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code;
  // Magic links only go to existing users (use-auth.tsx), and the owner is the only one.
  if (code === "otp_disabled") return "That email isn't set up as this bar's owner.";
  if (code === "anonymous_provider_disabled") return "Guest entry isn't switched on yet.";
  if (code === "over_email_send_rate_limit") return "Too many sign-in emails. Try again soon.";
  if (code === "over_request_rate_limit") return "Too many tries. Give it a few minutes.";
  return friendlyError(err);
}

export default function SignInPage() {
  const { me, loading, authError, clearAuthError, joinAsGuest, sendOwnerLink } = useAuth();
  const location = useLocation();
  const capsules = useCapsules();
  const settings = useSettings();

  const [tab, setTab] = useState<Tab>(authError ? "owner" : "guest");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [linkSentTo, setLinkSentTo] = useState<string | null>(null);

  if (loading) return <Loading />;
  if (me) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? ROUTES.BAR} replace />;
  }

  const preview = PREVIEW_IDS.flatMap((id) => capsules.data?.find((c) => c.id === id) ?? []);
  const shownError = error ?? (tab === "owner" ? authError : null);
  // Set when they came from the guest link (its QR code); a plain visit has no way in as a
  // guest, so it says where to find the link instead.
  const joinKey = joinKeyFromHash(location.hash);

  const switchTab = (next: Tab) => {
    setTab(next);
    setError(null);
    clearAuthError();
  };

  const enterAsGuest = async (e: FormEvent) => {
    e.preventDefault();
    if (!joinKey) return;
    if (!name.trim()) return setError(JOIN_ERRORS.no_name);
    setBusy(true);
    try {
      const status = await joinAsGuest(name.trim(), joinKey);
      if (status !== "ok") setError(JOIN_ERRORS[status]);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const sendLink = async (e: FormEvent) => {
    e.preventDefault();
    const address = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(address)) return setError("Enter your email address");
    setBusy(true);
    try {
      await sendOwnerLink(address);
      setLinkSentTo(address);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className={styles.screen}>
      <p className={styles.eyebrow}>{settings.data?.bar_name ?? "The Home Bar"}</p>
      <h1 className={styles.headline}>
        What are we <em>pouring</em> tonight?
      </h1>
      <div className={styles.preview}>
        {preview.map((c) => (
          <CapsuleTile
            key={c.id}
            src={sizedImage(c.img_box, IMAGE_WIDTH.sheet)}
            alt={c.name}
            radius={20}
            inset={6}
            eager
            className={styles.previewTile}
          />
        ))}
      </div>

      <div className={styles.formBlock}>
        <Segmented
          variant="block"
          label="Sign in as"
          value={tab}
          onChange={switchTab}
          options={[
            { value: "guest", label: "Guest" },
            { value: "owner", label: "Owner" },
          ]}
        />

        {tab === "guest" ? (
          joinKey ? (
            <form className={styles.form} onSubmit={enterAsGuest} noValidate>
              <input
                className={ui.input}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder="Your name"
                aria-label="Your name"
                autoComplete="nickname"
                maxLength={40}
              />
              {shownError && (
                <p className={ui.errorText} role="alert">
                  {shownError}
                </p>
              )}
              <button type="submit" className={cx(ui.primaryButton, styles.submit)} disabled={busy}>
                Enter the bar
              </button>
              <p className={styles.hint}>You'll stay signed in on this phone</p>
            </form>
          ) : (
            <p className={styles.noLink}>
              Scan the QR code at the bar, or ask the host to send you the guest link.
            </p>
          )
        ) : (
          <form className={styles.form} onSubmit={sendLink} noValidate>
            <input
              className={ui.input}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
                setLinkSentTo(null);
              }}
              placeholder="you@email.com"
              aria-label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
            />
            {shownError && (
              <p className={ui.errorText} role="alert">
                {shownError}
              </p>
            )}
            <button type="submit" className={cx(ui.primaryButton, styles.submit)} disabled={busy}>
              Send sign-in link
            </button>
            <p className={styles.hint} aria-live="polite">
              {linkSentTo
                ? `Check ${linkSentTo} for your sign-in link`
                : "Owners can restock, edit and get low-stock alerts"}
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
