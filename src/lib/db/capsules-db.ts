import type { CapsuleDbType, CollectionDbType } from "../../types";
import { supabase } from "../supabase";

/** The whole Bartesian catalog, in catalog order. Public: the sign-in screen uses it too. */
export async function getCapsules(): Promise<CapsuleDbType[]> {
  const { data, error } = await supabase.from("capsules").select("*").order("sort_order");
  if (error) throw error;
  return data as CapsuleDbType[];
}

/** Bartesian's variety packs and what's in each, in catalog order. */
export async function getCollections(): Promise<CollectionDbType[]> {
  const { data, error } = await supabase
    .from("collections")
    .select("*, collection_items(capsule_id, qty)")
    .order("sort_order");
  if (error) throw error;
  return data;
}
