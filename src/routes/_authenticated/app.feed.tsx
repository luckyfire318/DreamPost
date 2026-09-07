import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LockedNotice } from "@/components/LockedNotice";
import { PostGrid } from "@/components/PostGrid";
import { PullToRefresh } from "@/components/PullToRefresh";
import { type PostRow } from "@/components/PostCard";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/app/feed")({
  head: () => ({
    meta: [
      { title: "Community — DreamPost" },
      { name: "description", content: "Ideas, photos and videos shared with the DreamPost community." },
      { property: "og:title", content: "Community — DreamPost" },
      { property: "og:description", content: "Ideas and media shared with the DreamPost community." },
    ],
  }),
  component: Feed,
});

function Feed() {
  const { user, profile, refresh } = useSession();
  const qc = useQueryClient();
  const approved = profile?.status === "approved";
  const restricted = profile?.post_restricted ?? false;
  const canRead = approved && !restricted;

  const { data: posts, isLoading, isError } = useQuery({
    queryKey: ["posts"],
    enabled: canRead,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("community_posts")
        .select("id, caption, created_at, hidden, post_media(id, storage_path, media_type, position)")
        .eq("hidden", false)
        .neq("status", "deleted")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PostRow[];
    },
  });

  if (!profile) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (profile.status === "suspended") {
    return <LockedNotice title="Account suspended" description="Your account has been suspended by the admin. You can still reach out in the chat section." />;
  }
  if (!approved) {
    return <LockedNotice title="Waiting for approval" description="Community posts unlock as soon as the admin verifies your profile. Meanwhile you can complete your profile and read messages from the admin." />;
  }
  if (restricted) {
    return <LockedNotice title="Community locked" description="Access to community post is denied, contact admin" />;
  }

  return (
    <PullToRefresh onRefresh={async () => { await refresh(); await qc.invalidateQueries({ queryKey: ["posts"] }); }}>
      <div className="space-y-5">
        <h1 className="text-2xl font-semibold">Community</h1>
        {isLoading ? <p className="text-sm text-muted-foreground">Loading posts…</p> : null}
        {isError ? <p className="text-sm text-destructive">Could not load community posts. Please try again.</p> : null}
        {!isLoading && !isError && (posts ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No posts yet. Check back soon.</p> : null}
        <PostGrid posts={posts ?? []} userId={user!.id} isAdmin={false} canInteract={approved && !profile.post_restricted} />
      </div>
    </PullToRefresh>
  );
}
