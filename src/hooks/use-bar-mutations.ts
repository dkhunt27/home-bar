import { type QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { BOX_SIZE } from "../lib/bar";
import { rotateJoinKey, updateLowThreshold } from "../lib/db/settings-db";
import { addBox, adjustStock, takeCapsule, undoTake } from "../lib/db/stock-db";
import { notifyLowStock } from "../lib/low-stock-api";
import { MK, QK } from "../lib/query-keys";
import type { SettingsDbType, StockDbType } from "../types";

/** Rewrites one capsule's cached count, adding the stock row if it's new to the bar. */
function patchStockQty(
  queryClient: QueryClient,
  capsuleId: string,
  nextQty: (qty: number | undefined) => number,
) {
  queryClient.setQueryData<StockDbType[]>(QK.stock(), (rows) => {
    if (!rows) return rows;
    if (rows.some((r) => r.capsule_id === capsuleId)) {
      return rows.map((r) => (r.capsule_id === capsuleId ? { ...r, qty: nextQty(r.qty) } : r));
    }
    const now = new Date().toISOString();
    return [
      ...rows,
      { capsule_id: capsuleId, qty: nextQty(undefined), created_at: now, updated_at: now },
    ];
  });
}

function refreshStockAndActivity(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: QK.stock() });
  void queryClient.invalidateQueries({ queryKey: QK.activity() });
}

/** Pour one (guest or owner). Not optimistic: the Cheers screen should only ever show a pour
 * the database actually took. */
export function useTakeCapsule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (capsuleId: string) => takeCapsule(capsuleId),
    onSuccess: (result, capsuleId) => {
      patchStockQty(queryClient, capsuleId, () => result.qty);
      if (result.is_low) notifyLowStock();
    },
    onSettled: () => refreshStockAndActivity(queryClient),
  });
}

export function useUndoTake() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (activityId: string) => undoTake(activityId),
    onSettled: () => refreshStockAndActivity(queryClient),
  });
}

/** Owner: +8. Optimistic, so the Add list and Manage rows update on tap. */
export function useAddBox() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (capsuleId: string) => addBox(capsuleId),
    onMutate: async (capsuleId) => {
      await queryClient.cancelQueries({ queryKey: QK.stock() });
      const previous = queryClient.getQueryData<StockDbType[]>(QK.stock());
      patchStockQty(queryClient, capsuleId, (qty) => (qty ?? 0) + BOX_SIZE);
      return { previous };
    },
    onError: (_err, _capsuleId, context) => {
      if (context?.previous) queryClient.setQueryData(QK.stock(), context.previous);
    },
    onSettled: () => refreshStockAndActivity(queryClient),
  });
}

/** Owner: a +1/-1 shelf-count fix. Optimistic, and only refetches once the last of a burst
 * of stepper taps has landed, so the number never jumps back mid-tap. */
export function useAdjustStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: MK.adjustStock,
    mutationFn: ({ capsuleId, delta }: { capsuleId: string; delta: number }) =>
      adjustStock(capsuleId, delta),
    onMutate: async ({ capsuleId, delta }) => {
      await queryClient.cancelQueries({ queryKey: QK.stock() });
      patchStockQty(queryClient, capsuleId, (qty) => Math.max(0, (qty ?? 0) + delta));
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: MK.adjustStock }) === 1) {
        void queryClient.invalidateQueries({ queryKey: QK.stock() });
      }
    },
  });
}

export function useSetLowThreshold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lowThreshold: number) => updateLowThreshold(lowThreshold),
    onMutate: async (lowThreshold) => {
      await queryClient.cancelQueries({ queryKey: QK.settings() });
      const previous = queryClient.getQueryData<SettingsDbType>(QK.settings());
      if (previous) {
        queryClient.setQueryData<SettingsDbType>(QK.settings(), {
          ...previous,
          low_threshold: lowThreshold,
        });
      }
      return { previous };
    },
    onError: (_err, _value, context) => {
      if (context?.previous) queryClient.setQueryData(QK.settings(), context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QK.settings() }),
  });
}

/** Owner: retire the guest link for a new one. Not optimistic: the QR code should only
 * ever show a key the database has. */
export function useRotateJoinKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rotateJoinKey,
    onSuccess: (key) => queryClient.setQueryData(QK.joinKey(), key),
  });
}
