import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { buildShelf, type ShelfItem, stockStatus } from "../lib/bar";
import { getRecentActivity } from "../lib/db/activity-db";
import { getCapsules } from "../lib/db/capsules-db";
import { getJoinKey, getSettings } from "../lib/db/settings-db";
import { getStock } from "../lib/db/stock-db";
import { QK } from "../lib/query-keys";

const DEFAULT_LOW_THRESHOLD = 2;

/** The catalog only changes with a migration, so it's fetched once per session. */
export function useCapsules() {
  return useQuery({
    queryKey: QK.capsules(),
    queryFn: getCapsules,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useStock() {
  return useQuery({ queryKey: QK.stock(), queryFn: getStock });
}

export function useSettings() {
  return useQuery({ queryKey: QK.settings(), queryFn: getSettings });
}

export function useActivity() {
  return useQuery({ queryKey: QK.activity(), queryFn: () => getRecentActivity() });
}

/** Owner only (get_join_key() raises for anyone else). */
export function useJoinKey() {
  return useQuery({ queryKey: QK.joinKey(), queryFn: getJoinKey });
}

/** The catalog joined to stock, plus settings: what nearly every screen needs. */
export function useShelf() {
  const capsules = useCapsules();
  const stock = useStock();
  const settings = useSettings();
  const threshold = settings.data?.low_threshold ?? DEFAULT_LOW_THRESHOLD;

  const shelf = useMemo(
    () => buildShelf(capsules.data ?? [], stock.data ?? [], threshold),
    [capsules.data, stock.data, threshold],
  );

  return {
    shelf,
    catalog: capsules.data ?? [],
    settings: settings.data,
    threshold,
    isPending: capsules.isPending || stock.isPending || settings.isPending,
    error: capsules.error ?? stock.error ?? settings.error,
  };
}

/** One capsule's shelf entry. A catalog capsule that's not in the bar comes back as qty 0
 * with `inBar: false`; an id that isn't in the catalog comes back as null. */
export function useShelfItem(capsuleId: string | undefined) {
  const data = useShelf();
  const { shelf, catalog, threshold } = data;
  const found = useMemo(() => {
    const stocked = shelf.find((i) => i.capsule.id === capsuleId);
    if (stocked) return { item: stocked, inBar: true };
    const capsule = catalog.find((c) => c.id === capsuleId);
    if (!capsule) return null;
    const item: ShelfItem = { capsule, qty: 0, status: stockStatus(0, threshold) };
    return { item, inBar: false };
  }, [shelf, catalog, capsuleId, threshold]);
  return { ...data, found };
}
