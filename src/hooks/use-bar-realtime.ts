import { type QueryKey, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { QK } from "../lib/query-keys";
import { supabase } from "../lib/supabase";

/**
 * Keeps counts live while several people use the bar at once: any change to stock, activity
 * or settings (supabase/migrations/013_realtime.sql) refetches that query. While one of our
 * own mutations is in flight the refetch is skipped; the mutation refreshes when it settles,
 * and refetching mid-flight would briefly overwrite its optimistic count.
 *
 * Realtime drops while a phone sleeps; refetch-on-focus (React Query's default) catches up.
 */
export function useBarRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const refresh = (queryKey: QueryKey) => () => {
      if (queryClient.isMutating() === 0) void queryClient.invalidateQueries({ queryKey });
    };
    const channel = supabase
      .channel("bar-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "stock" }, refresh(QK.stock()))
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity" },
        refresh(QK.activity()),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settings" },
        refresh(QK.settings()),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
