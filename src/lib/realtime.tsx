import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";

/** Shared realtime synchronization for the authenticated application. */
export function RealtimeSync() {
  const qc = useQueryClient();
  const { user, isAdmin, refresh } = useSession();
  const userId = user?.id ?? null;
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const invalidate = (keys: readonly unknown[][]) => {
      if (cancelled) return;
      for (const key of keys) void qc.invalidateQueries({ queryKey: key });
    };
    const rowId = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>, field: string) => {
      const next = payload.new as Record<string, unknown> | null;
      const prev = payload.old as Record<string, unknown> | null;
      return (next?.[field] ?? prev?.[field]) as string | undefined;
    };

    const channel = supabase
      .channel(`dreampost-sync-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "community_posts" }, () => invalidate([["posts"]]))
      .on("postgres_changes", { event: "*", schema: "public", table: "post_media" }, () => invalidate([["posts"]]))
      .on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, (payload) => {
        const postId = rowId(payload, "post_id");
        if (postId) invalidate([["likes", postId], ["posts"]]);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "post_comments" }, (payload) => {
        const postId = rowId(payload, "post_id");
        if (postId) invalidate([["comments", postId], ["posts"]]);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, (payload) => {
        const memberId = rowId(payload, "member_id");
        invalidate([["messages"]]);
        if (memberId) invalidate([["messages", memberId]]);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, (payload) => {
        const id = rowId(payload, "id");
        if (isAdmin) invalidate([["members"], ["members-full"]]);
        if (id === userId) {
          void refreshRef.current();
          invalidate([["posts"], ["profile"]]);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, () => invalidate([["app-settings"]]))
      .on("postgres_changes", { event: "*", schema: "public", table: "media_limits" }, () => invalidate([["media-limits"]]))
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [userId, isAdmin, qc]);

  return null;
}
