import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CropDialog } from "@/components/CropDialog";
import { type PostRow } from "@/components/PostCard";
import { PostGrid } from "@/components/PostGrid";
import { PullToRefresh } from "@/components/PullToRefresh";
import { supabase } from "@/integrations/supabase/client";
import { checkSize, uploadFile } from "@/lib/media";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/admin/posts")({
  head: () => ({ meta: [{ title: "Community posts — DreamPost admin" }, { name: "description", content: "Create and manage DreamPost community posts." }] }),
  component: AdminPosts,
});

type Draft = { id: string; blob: Blob; url: string; type: string };
const MAX_MEDIA = 7;

function AdminPosts() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [caption, setCaption] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const { data: limits } = useQuery({
    queryKey: ["media-limits"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("media_limits").select("media_type,max_size_mb,enabled");
      if (error) throw error;
      return data ?? [];
    },
  });
  const imageLimit = Number(limits?.find((x: any) => x.media_type === "image")?.max_size_mb ?? 10);
  const videoLimit = Number(limits?.find((x: any) => x.media_type === "video")?.max_size_mb ?? 50);

  const { data: posts } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("community_posts")
        .select("id, caption, created_at, hidden, post_media(id, storage_path, media_type, position)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PostRow[];
    },
  });

  const publish = useMutation({
    mutationFn: async () => {
      if (!caption.trim() && drafts.length === 0) throw new Error("Add a caption or media");
      const { data: post, error } = await (supabase as any).from("community_posts").insert({ author_id: user!.id, caption: caption.trim() || null, status: "published", hidden: false }).select("id").single();
      if (error) throw new Error(error.message);
      for (const [index, draft] of drafts.entries()) {
        const ext = draft.type.startsWith("video") ? "mp4" : "jpg";
        const path = `${post.id}/${crypto.randomUUID()}.${ext}`;
        await uploadFile("post-media", path, draft.blob, draft.type);
        const { error: mediaError } = await (supabase as any).from("post_media").insert({ post_id: post.id, storage_path: path, media_type: draft.type.startsWith("video") ? "video" : "image", position: index, sort_order: index, mime_type: draft.type, file_size_bytes: draft.blob.size });
        if (mediaError) throw new Error(mediaError.message);
      }
    },
    onSuccess: () => { setCaption(""); setDrafts([]); void qc.invalidateQueries({ queryKey: ["posts"] }); toast.success("Post published"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not publish"),
  });

  const removePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("community_posts").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["posts"] }); toast.success("Post deleted"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete post"),
    onSettled: () => setPendingDelete(null),
  });

  const toggleHidden = useMutation({
    mutationFn: async (post: PostRow) => {
      const { error } = await (supabase as any).from("community_posts").update({ hidden: !post.hidden, status: post.hidden ? "published" : "hidden" }).eq("id", post.id);
      if (error) throw new Error(error.message);
      return !post.hidden;
    },
    onSuccess: (hidden) => { void qc.invalidateQueries({ queryKey: ["posts"] }); toast.success(hidden ? "Post hidden from members" : "Post visible to everyone"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update visibility"),
  });

  function pickFile(file: File) {
    const problem = checkSize(file, imageLimit, videoLimit);
    if (problem) { toast.error(problem); return; }
    if (drafts.length >= MAX_MEDIA) { toast.error(`You can share up to ${MAX_MEDIA} files at once`); return; }
    if (file.type.startsWith("video/")) setDrafts((d) => [...d, { id: crypto.randomUUID(), blob: file, url: URL.createObjectURL(file), type: file.type }]);
    else setCropSrc(URL.createObjectURL(file));
  }

  return (
    <PullToRefresh onRefresh={() => qc.invalidateQueries({ queryKey: ["posts"] })}>
      <div className="space-y-6">
        <section className="card-soft space-y-4 p-6">
          <h1 className="text-xl font-semibold">New community post</h1>
          <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Share an idea with the community…" rows={3} />
          <div className="flex flex-wrap gap-3">
            {drafts.map((d) => <div key={d.id} className="relative h-24 w-24 overflow-hidden rounded-xl bg-muted">{d.type.startsWith("video") ? <video src={d.url} className="h-full w-full object-cover" /> : <img src={d.url} alt="Selected media" className="h-full w-full object-cover" />}<button type="button" onClick={() => setDrafts((list) => list.filter((x) => x.id !== d.id))} className="absolute right-1 top-1 rounded-full bg-background/90 p-1"><X className="h-3 w-3" /></button></div>)}
            {drafts.length < MAX_MEDIA ? <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-xs text-muted-foreground"><ImagePlus className="h-5 w-5" />Add<input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ""; }} /></label> : null}
          </div>
          <Button className="rounded-full" onClick={() => publish.mutate()} disabled={publish.isPending}>{publish.isPending ? "Publishing…" : "Publish post"}</Button>
        </section>
        <PostGrid posts={posts ?? []} userId={user!.id} isAdmin canInteract onDeletePost={(id) => setPendingDelete(id)} onToggleHidden={(post) => toggleHidden.mutate(post)} />
        <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this post?</AlertDialogTitle><AlertDialogDescription>This permanently removes the post, its media and comments for everyone. This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={removePost.isPending}>Cancel</AlertDialogCancel><AlertDialogAction disabled={removePost.isPending} onClick={(e) => { e.preventDefault(); if (pendingDelete && !removePost.isPending) removePost.mutate(pendingDelete); }}>{removePost.isPending ? "Deleting…" : "Delete"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        <CropDialog open={!!cropSrc} src={cropSrc} aspect={0} title="Crop before posting" onCancel={() => setCropSrc(null)} onDone={(blob) => { setDrafts((d) => [...d, { id: crypto.randomUUID(), blob, url: URL.createObjectURL(blob), type: "image/jpeg" }]); setCropSrc(null); }} />
      </div>
    </PullToRefresh>
  );
}
