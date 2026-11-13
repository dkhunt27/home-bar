import type { ActivityDbType } from "../../types";
import { supabase } from "../supabase";

/** Newest first. The Activity screen is a recent log, not an archive. */
export async function getRecentActivity(limit = 150): Promise<ActivityDbType[]> {
  const { data, error } = await supabase
    .from("activity")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as ActivityDbType[];
}
