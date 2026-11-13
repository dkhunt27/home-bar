import { type QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { BOX_SIZE } from "../lib/bar";
import { setBoxExpiry } from "../lib/db/boxes-db";
import { registerPasskey } from "../lib/db/passkeys-db";
import { rotateJoinKey, updateLowThreshold } from "../lib/db/settings-db";
import { addBox, addCollectionBox, adjustStock, takeCapsule, undoTake } from "../lib/db/stock-db";
import { notifyLowStock } from "../lib/low-stock-api";
import { MK, QK } from "../lib/query-keys";
import type { BoxDbType, CollectionDbType, SettingsDbType, StockDbType } from "../types";

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

/** Every count change moves the best-by boxes too (sync_boxes in 019_boxes.sql). */
function refreshStockAndActivity(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: QK.stock() });
  void queryClient.invalidateQueries({ queryKey: QK.boxes() });
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

/** Applies a box's counts to the cache now, and hands back a way to undo that on error. */
async function patchForBox(queryClient: QueryClient, amounts: [capsuleId: string, n: number][]) {
  await queryClient.cancelQueries({ queryKey: QK.stock() });
  const previous = queryClient.getQueryData<StockDbType[]>(QK.stock());
  for (const [capsuleId, n] of amounts) {
    patchStockQty(queryClient, capsuleId, (qty) => (qty ?? 0) + n);
  }
  return { previous };
}

/** Owner: +8, with the box's best-by date (or null). Optimistic, so the Add list and Manage
 * rows update as the sheet closes. */
export function useAddBox() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ capsuleId, expiresOn }: { capsuleId: string; expiresOn: string | null }) =>
      addBox(capsuleId, expiresOn),
    onMutate: ({ capsuleId }) => patchForBox(queryClient, [[capsuleId, BOX_SIZE]]),
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(QK.stock(), context.previous);
    },
    onSettled: () => refreshStockAndActivity(queryClient),
  });
}

/** Owner: a variety pack, each cocktail in it on the shelf at once. Optimistic too. */
export function useAddCollectionBox() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      collection,
      expiresOn,
    }: {
      collection: CollectionDbType;
      expiresOn: string | null;
    }) => addCollectionBox(collection.id, expiresOn),
    onMutate: ({ collection }) =>
      patchForBox(
        queryClient,
        collection.collection_items.map((i) => [i.capsule_id, i.qty]),
      ),
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(QK.stock(), context.previous);
    },
    onSettled: () => refreshStockAndActivity(queryClient),
  });
}

/** Owner: fix or fill in a box's best-by date. Optimistic: the row moves as the sheet closes. */
export function useSetBoxExpiry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ boxId, expiresOn }: { boxId: string; expiresOn: string | null }) =>
      setBoxExpiry(boxId, expiresOn),
    onMutate: async ({ boxId, expiresOn }) => {
      await queryClient.cancelQueries({ queryKey: QK.boxes() });
      const previous = queryClient.getQueryData<BoxDbType[]>(QK.boxes());
      queryClient.setQueryData<BoxDbType[]>(QK.boxes(), (rows) =>
        rows?.map((b) => (b.id === boxId ? { ...b, expires_on: expiresOn } : b)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(QK.boxes(), context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QK.boxes() }),
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
        void queryClient.invalidateQueries({ queryKey: QK.boxes() });
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

/** Saves a passkey for Face ID sign-in. Not optimistic: the phone's sheet can be cancelled. */
export function useRegisterPasskey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registerPasskey,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QK.passkeys() }),
  });
}
