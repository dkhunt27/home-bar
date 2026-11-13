import type { PasskeyListItem } from "@supabase/supabase-js";
import { supabase } from "../supabase";

/** The signed-in user's passkeys (Supabase Auth keeps them, not our tables). */
export async function listPasskeys(): Promise<PasskeyListItem[]> {
  const { data, error } = await supabase.auth.passkey.list();
  if (error) throw error;
  return data;
}

/** Opens the phone's Face ID / passkey sheet and saves the new passkey to this user. */
export async function registerPasskey(): Promise<void> {
  const { error } = await supabase.auth.registerPasskey();
  if (error) throw error;
}
