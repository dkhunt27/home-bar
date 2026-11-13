import { useState } from "react";
import { BackButton } from "../components/back-button";
import { LoadError } from "../components/load-error";
import { Loading } from "../components/loading";
import { QrCode } from "../components/qr-code";
import { Screen } from "../components/screen";
import ui from "../components/ui.module.css";
import { useJoinKey, useSettings } from "../hooks/use-bar-data";
import { useRotateJoinKey } from "../hooks/use-bar-mutations";
import { guestLink } from "../lib/bar";
import { friendlyError } from "../lib/errors";
import { ROUTES } from "../routes";
import styles from "./guest-link-page.module.css";

export default function GuestLinkPage() {
  const joinKey = useJoinKey();
  const settings = useSettings();
  const rotate = useRotateJoinKey();
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  if (joinKey.error) return <LoadError error={joinKey.error} />;
  if (joinKey.isPending) return <Loading />;

  const barName = settings.data?.bar_name ?? "the bar";
  const link = joinKey.data ? guestLink(window.location.origin, joinKey.data) : null;
  // The share sheet is the easy way to text it to someone, but desktop browsers mostly
  // don't have one.
  const canShare = typeof navigator.share === "function";

  const copy = (value: string) => {
    navigator.clipboard.writeText(value).then(
      () => setCopiedLink(value),
      () => {},
    );
  };
  // Rejects when they close the share sheet without picking anything; nothing to report.
  const share = (value: string) => {
    navigator.share({ title: barName, url: value }).catch(() => {});
  };
  const makeNew = () => {
    const ok =
      !link ||
      window.confirm(
        "Make a new guest link? This one stops working, and everyone who's joined will need the new one to get back in.",
      );
    if (ok) rotate.mutate();
  };

  return (
    <Screen gap={22}>
      <header className={styles.header}>
        <BackButton fallback={ROUTES.MANAGE} />
        <h1 className={styles.title}>Guest link</h1>
      </header>

      {link ? (
        <>
          <p className={styles.lead}>
            Guests scan this to join {barName}, then just type their name.
          </p>
          <QrCode value={link} label={`QR code for the ${barName} guest link`} />
          <p className={styles.link}>{link}</p>
          <div className={styles.actions}>
            <button
              type="button"
              className={canShare ? styles.secondary : ui.primaryButton}
              onClick={() => copy(link)}
            >
              {copiedLink === link ? "Copied" : "Copy link"}
            </button>
            {canShare && (
              <button type="button" className={ui.primaryButton} onClick={() => share(link)}>
                Share
              </button>
            )}
          </div>
        </>
      ) : (
        <p className={styles.lead}>There's no guest link yet. Make one to let guests in.</p>
      )}

      <div className={styles.card}>
        <div className={styles.cardText}>
          <span className={styles.cardTitle}>{link ? "Link got around?" : "Guest link"}</span>
          <span className={ui.rowMeta}>
            {link
              ? "You get an email with each new guest's name. If one's a stranger, make a new link: it signs everyone out until they use the new one."
              : "Anyone with the link can join, so share it with guests only."}
          </span>
          {rotate.error && (
            <span className={ui.errorText} role="alert">
              {friendlyError(rotate.error)}
            </span>
          )}
        </div>
        <button
          type="button"
          className={link ? styles.danger : ui.pillFilled}
          onClick={makeNew}
          disabled={rotate.isPending}
        >
          {link ? "New link" : "Make link"}
        </button>
      </div>
    </Screen>
  );
}
