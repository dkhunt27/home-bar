import type { JoinBarStatusType, MeRoleType, MeType } from "../../types";
import { supabase } from "../supabase";

/** Null for a session that is neither the owner nor a guest who joined by the guest link. */
export async function getMe(): Promise<MeType | null> {
  const { data, error } = await supabase.rpc("get_me").maybeSingle();
  if (error) throw error;
  return data ? { role: data.role as MeRoleType, name: data.name } : null;
}

/** Promote the current (anonymous) session to a guest, if the guest link's key is current. */
export async function joinBar(name: string, key: string): Promise<JoinBarStatusType> {
  const { data, error } = await supabase.rpc("join_bar", { p_name: name, p_key: key });
  if (error) throw error;
  return data as JoinBarStatusType;
}
