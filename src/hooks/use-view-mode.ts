import { useCallback, useState } from "react";

export type ViewMode = "grid" | "list";

const STORAGE_KEY = "home-bar:view";

function readViewMode(): ViewMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}

/** Bar screen grid/list choice, remembered on this device. */
export function useViewMode(): [ViewMode, (mode: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>(readViewMode);
  const update = useCallback((next: ViewMode) => {
    setMode(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private browsing: just don't remember it.
    }
  }, []);
  return [mode, update];
}
