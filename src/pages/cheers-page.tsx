import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { CapsuleTile } from "../components/capsule-tile";
import ui from "../components/ui.module.css";
import { useAuth } from "../hooks/use-auth";
import { useCapsules, useSettings } from "../hooks/use-bar-data";
import { useUndoTake } from "../hooks/use-bar-mutations";
import { friendlyError } from "../lib/errors";
import { IMAGE_WIDTH, sizedImage } from "../lib/images";
import { type CheersState, ROUTES } from "../routes";
import styles from "./cheers-page.module.css";

export default function CheersPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { me, isOwner } = useAuth();
  const capsules = useCapsules();
  const settings = useSettings();
  const undo = useUndoTake();

  const state = location.state as CheersState | null;
  const capsule = capsules.data?.find((c) => c.id === state?.capsuleId);
  if (!state || (capsules.isSuccess && !capsule)) return <Navigate to={ROUTES.BAR} replace />;
  if (!capsule) return null;

  // Back to wherever the pour started (the Bar, at its scroll position), not a new copy of it.
  const backToBar = () => {
    if (location.key === "default") navigate(ROUTES.BAR, { replace: true });
    else navigate(-1);
  };

  const ownerName = settings.data?.owner_name ?? "The host";

  return (
    <main className={styles.screen}>
      <CapsuleTile
        src={sizedImage(capsule.img_pour, IMAGE_WIDTH.pour)}
        alt={capsule.name}
        size={230}
        radius={115}
        inset={22}
        eager
      />
      <h1 className={styles.title}>Cheers, {me?.name ?? "friend"}.</h1>
      <p className={styles.sub}>
        One {capsule.name} checked out · {state.qty} left
      </p>
      {state.isLow && (
        <p className={styles.lowPill}>
          {isOwner
            ? "Running low · time to restock"
            : `Running low · ${ownerName} has been notified`}
        </p>
      )}
      {undo.isError && <p className={ui.errorText}>{friendlyError(undo.error)}</p>}
      <div className={styles.actions}>
        <button type="button" className={ui.primaryButtonLarge} onClick={backToBar}>
          Back to the bar
        </button>
        <button
          type="button"
          className={styles.undo}
          disabled={undo.isPending}
          onClick={() => undo.mutate(state.activityId, { onSuccess: backToBar })}
        >
          Undo
        </button>
      </div>
    </main>
  );
}
