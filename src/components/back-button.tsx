import { useLocation, useNavigate } from "react-router-dom";
import ui from "./ui.module.css";

interface BackButtonProps {
  /** Where to go when there's no in-app history to go back to (opened from a link). */
  fallback: string;
  label?: string;
}

/** The 44px round ← button. Goes back in history, so the Bar keeps its scroll and filter. */
export function BackButton({ fallback, label = "Back" }: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const goBack = () => {
    if (location.key === "default") navigate(fallback, { replace: true });
    else navigate(-1);
  };
  return (
    <button type="button" className={ui.circleButton} onClick={goBack} aria-label={label}>
      ←
    </button>
  );
}
