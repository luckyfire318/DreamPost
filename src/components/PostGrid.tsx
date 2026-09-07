import { useState } from "react";
import { EyeOff, ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ProtectedMedia } from "@/components/ProtectedMedia";
import { PostCard, type PostRow } from "@/components/PostCard";

type Props = {
  posts: PostRow[];
  userId: string;
  isAdmin: boolean;
  canInteract: boolean;
  onDeletePost?: ((id: string) => void) | undefined;
  onToggleHidden?: ((post: PostRow) => void) | undefined;
};

export function PostGrid({ posts, userId, isAdmin, canInteract, onDeletePost, onToggleHidden }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const active = posts.find((p) => p.id === openId) ?? null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {posts.map((post) => {
          const cover = [...post.post_media].sort((a, b) => a.position - b.position)[0];
          return (
            <button
              key={post.id}
              type="button"
              onClick={() => setOpenId(post.id)}
              className="card-soft group overflow-hidden text-left transition-transform active:scale-[0.98]"
            >
              {cover ? (
                <ProtectedMedia
                  bucket="post-media"
                  path={cover.storage_path}
                  type={cover.media_type}
                  className="aspect-4/5 w-full rounded-none"
                  alt={post.caption ?? "Community post"}
                />
              ) : (
                <div className="flex aspect-4/5 w-full items-center justify-center bg-secondary">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="space-y-1 p-3">
                {post.caption ? (
                  <p className="line-clamp-3 text-sm leading-snug">{post.caption}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No caption</p>
                )}
                {isAdmin && post.hidden ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium">
                    <EyeOff className="h-3 w-3" /> Hidden
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto p-0">
          <DialogTitle className="sr-only">Community post</DialogTitle>
          {active ? (
            <PostCard
              post={active}
              userId={userId}
              isAdmin={isAdmin}
              canInteract={canInteract}
              onDeletePost={onDeletePost}
              onToggleHidden={onToggleHidden}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
