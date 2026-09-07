import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChatThread } from "@/components/ChatThread";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useQueryClient } from "@tanstack/react-query";
import { signedUrl } from "@/lib/media";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/app/chat")({
  head: () => ({
    meta: [
      { title: "Chat with admin — DreamPost" },
      { name: "description", content: "Your private conversation with the DreamPost admin." },
      { property: "og:title", content: "Chat with admin — DreamPost" },
      { property: "og:description", content: "Private one-to-one conversation with the admin." },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const { user, profile } = useSession();
  const qc = useQueryClient();
  const [bg, setBg] = useState<string | null>(null);
  const bgPath = profile?.chat_bg_url ?? null;

  useEffect(() => {
    if (!bgPath) {
      setBg(null);
      return;
    }
    void signedUrl("avatars", bgPath).then(setBg);
  }, [bgPath]);

  if (!user || !profile) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const canSend =
    profile.status === "approved" && !profile.message_restricted;

  return (
    <PullToRefresh onRefresh={() => qc.invalidateQueries({ queryKey: ["messages"] })}>
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Chat with admin</h1>
        <p className="text-sm text-muted-foreground">
          {canSend
            ? "Messages and media stay between you and the admin."
            : "You can read messages from the admin here."}
        </p>
      </div>
      <ChatThread
        memberId={user.id}
        currentUserId={user.id}
        isAdmin={false}
        canSend={canSend}
        backgroundUrl={bg}
        lockedMessage={
          profile.status !== "approved"
            ? "Sending unlocks once the admin approves your profile."
            : "Sending messages is currently restricted by the admin."
        }
      />
    </div>
    </PullToRefresh>
  );
}