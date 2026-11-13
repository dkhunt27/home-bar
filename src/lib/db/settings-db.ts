import type { SettingsDbType } from "../../types";
import { supabase } from "../supabase";

export async function getSettings(): Promise<SettingsDbType> {
  const { data, error } = await supabase.from("settings").select("*").eq("id", 1).single();
  if (error) throw error;
  return data;
}

/** Owner only (RLS). */
export async function updateLowThreshold(lowThreshold: number): Promise<void> {
  const { error } = await supabase
    .from("settings")
    .update({ low_threshold: lowThreshold })
    .eq("id", 1);
  if (error) throw error;
}

/** Owner only: the key in the guest link. Null until one is made (a fresh project). */
export async function getJoinKey(): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_join_key");
  if (error) throw error;
  return data;
}

/** Owner only: a new guest link. Retires the old one and signs every guest out. */
export async function rotateJoinKey(): Promise<string> {
  const { data, error } = await supabase.rpc("rotate_join_key");
  if (error) throw error;
  return data;
}
