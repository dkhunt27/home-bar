import type { StockDbType, TakeCapsuleResultType } from "../../types";
import { supabase } from "../supabase";

export async function getStock(): Promise<StockDbType[]> {
  const { data, error } = await supabase.from("stock").select("*");
  if (error) throw error;
  return data;
}

/** Pour one. Throws 'out_of_stock' if someone beat you to the last one. */
export async function takeCapsule(capsuleId: string): Promise<TakeCapsuleResultType> {
  const { data, error } = await supabase.rpc("take_capsule", { p_capsule_id: capsuleId }).single();
  if (error) throw error;
  return data;
}

/** Put your own pour back, within 5 minutes. Resolves to the count after. */
export async function undoTake(activityId: string): Promise<number> {
  const { data, error } = await supabase.rpc("undo_take", { p_activity_id: activityId });
  if (error) throw error;
  return data;
}

/** Owner: +8, adding the capsule to the bar if it wasn't there. `expiresOn` is the box's
 * best-by date ("2027-01-15"), or null when there isn't one. Resolves to the new count. */
export async function addBox(capsuleId: string, expiresOn: string | null): Promise<number> {
  const { data, error } = await supabase.rpc("add_box", {
    p_capsule_id: capsuleId,
    p_expires_on: expiresOn ?? undefined,
  });
  if (error) throw error;
  return data;
}

/** Owner: one variety pack. Each cocktail in it goes on the shelf with the box's date. */
export async function addCollectionBox(
  collectionId: string,
  expiresOn: string | null,
): Promise<void> {
  const { error } = await supabase.rpc("add_collection_box", {
    p_collection_id: collectionId,
    p_expires_on: expiresOn ?? undefined,
  });
  if (error) throw error;
}

/** Owner: a +1/-1 miscount fix. Not logged. Resolves to the new count. */
export async function adjustStock(capsuleId: string, delta: number): Promise<number> {
  const { data, error } = await supabase.rpc("adjust_stock", {
    p_capsule_id: capsuleId,
    p_delta: delta,
  });
  if (error) throw error;
  return data;
}
