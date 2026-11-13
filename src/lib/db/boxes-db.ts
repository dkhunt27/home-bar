import type { BoxDbType } from "../../types";
import { supabase } from "../supabase";

/** Owner only (RLS returns nothing to anyone else): the boxes that still have some left. */
export async function getBoxes(): Promise<BoxDbType[]> {
  const { data, error } = await supabase.from("boxes").select("*").gt("qty", 0);
  if (error) throw error;
  return data;
}

/** Owner: change a box's best-by date ("2027-01-15"), or clear it with null. */
export async function setBoxExpiry(boxId: string, expiresOn: string | null): Promise<void> {
  const { error } = await supabase.rpc("set_box_expiry", {
    p_box_id: boxId,
    // The type generator can't mark an SQL argument nullable; NULL is how the date clears.
    p_expires_on: expiresOn as string,
  });
  if (error) throw error;
}
