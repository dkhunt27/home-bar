import type { CapsuleDbType } from "../../types";
import { supabase } from "../supabase";

/** The whole Bartesian catalog, in catalog order. Public: the sign-in screen uses it too. */
export async function getCapsules(): Promise<CapsuleDbType[]> {
  const { data, error } = await supabase.from("capsules").select("*").order("sort_order");
  if (error) throw error;
  return data as CapsuleDbType[];
}
