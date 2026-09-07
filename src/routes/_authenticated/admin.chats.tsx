import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { ArrowLeft, ImageIcon, Search, X } from "lucide-react";
import { ChatThread } from "@/components/ChatThread";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { signedUrl } from "@/lib/media";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/chats")({
  head: () => ({
    meta: [
      { title: "Member chats — DreamPost admin" },
      { name: "description", content: "Private conversations with every DreamPost member." },
      { property: "og:title", content: "Member chats — DreamPost admin" },
      { property: "og:description", content: "Private conversations with every member." },
    ],
  }),
  component: AdminChats,
});

type Tab = "primary" | "general" | "waiting";
const TABS: { id: Tab; label: string }[] = [
  { id: "primary", label: "Primary" },
  { id: "general", label: "General" },
  { id: "waiting", label: "Waiting List" },
];

type MemberRow = {
  id: string;
  full_name: string;
  username: string;
  email: string;
  avatar_url: string | null;
  status: "pending" | "approved" | "suspended";
  chat_category: "primary" | "general";
};

type MessageRow = {
  id: string;
  member_id: string;
  sender_id: string;
  body: string | null;
  media_path: string | null;
  created_at: string;
};

function AdminChats() {
  const { user } = useSession();
  const [active, setActive] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("primary");
  const [query, setQuery] = useState("");
  const touchX = useRef<number | null>(null);
  const touchY = useRef<number | null>(null);

  const { data: members } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, username, email, avatar_url, status, chat_category")
        .neq("id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MemberRow[];
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, member_id, sender_id, body, media_path, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as MessageRow[];
    },
  });

  // last message + unread count (member messages newer than the admin's latest reply)
  const threads = useMemo(() => {
    const map = new Map<string, { last: MessageRow; unread: number; text: string }>();
    for (const m of recent ?? []) {
      const entry = map.get(m.member_id);
      if (!entry) map.set(m.member_id, { last: m, unread: 0, text: "" });
    }
    for (const [memberId, entry] of map) {
      const thread = (recent ?? []).filter((m) => m.member_id === memberId);
      let unread = 0;
      for (const m of thread) {
        if (m.sender_id !== memberId) break;
        unread += 1;
      }
      entry.unread = unread;
      entry.text = thread
        .map((m) => m.body ?? "")
        .join(" ")
        .toLowerCase();
    }
    return map;
  }, [recent]);

  const all = members ?? [];
  const pendingCount = all.filter((m) => m.status === "pending").length;

  const q = query.trim().toLowerCase();
  const visible = all
    .filter((m) => (tab === "waiting" ? m.status === "pending" : m.status !== "pending" && m.chat_category === tab))
    .filter((m) => {
      if (!q) return true;
      const t = threads.get(m.id)?.text ?? "";
      return (
        m.full_name.toLowerCase().includes(q) ||
        m.username.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        t.includes(q)
      );
    })
    .sort((a, b) => {
      const ta = threads.get(a.id)?.last.created_at ?? "";
      const tb = threads.get(b.id)?.last.created_at ?? "";
      return tb.localeCompare(ta);
    });

  const activeMember = active ? all.find((m) => m.id === active) ?? null : null;
  useEffect(() => {
    if (active && !activeMember) setActive(null);
  }, [active, activeMember]);

  function swipeTab(dir: 1 | -1) {
    const i = TABS.findIndex((t) => t.id === tab);
    const next = TABS[Math.min(TABS.length - 1, Math.max(0, i + dir))];
    if (next) setTab(next.id);
  }

  return (
    <div className="grid gap-4 md:grid-cols-[20rem_1fr]">
      <aside className={cn("card-soft flex max-h-[70vh] flex-col overflow-hidden", active && "hidden md:flex")}>
        <div className="space-y-3 border-b border-border p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search or start a chat"
              className="rounded-full pl-10 pr-9"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <div className="flex gap-1 rounded-full bg-secondary/50 p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-semibold transition-colors",
                  tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                <span className="truncate">{t.label}</span>
                {t.id === "waiting" && pendingCount > 0 ? (
                  <span className="rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                    {pendingCount}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto"
          onTouchStart={(e) => {
            touchX.current = e.touches[0]?.clientX ?? null;
            touchY.current = e.touches[0]?.clientY ?? null;
          }}
          onTouchEnd={(e) => {
            const sx = touchX.current;
            const sy = touchY.current;
            touchX.current = null;
            touchY.current = null;
            if (sx === null || sy === null) return;
            const dx = (e.changedTouches[0]?.clientX ?? sx) - sx;
            const dy = (e.changedTouches[0]?.clientY ?? sy) - sy;
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) swipeTab(dx < 0 ? 1 : -1);
          }}
        >
          {visible.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {q
                ? "No conversations match your search."
                : tab === "waiting"
                  ? "No members are waiting for approval."
                  : `No ${tab} conversations yet.`}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {visible.map((m) => {
                const thread = threads.get(m.id);
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => setActive(m.id)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors",
                        active === m.id ? "bg-secondary" : "hover:bg-secondary/60",
                      )}
                    >
                      <Avatar path={m.avatar_url} name={m.full_name} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-semibold">{m.full_name}</span>
                          {thread ? (
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {formatDistanceToNowStrict(new Date(thread.last.created_at), { addSuffix: false })}
                            </span>
                          ) : null}
                        </span>
                        <span className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-1 truncate text-xs text-muted-foreground">
                            {thread?.last.media_path ? <ImageIcon className="h-3 w-3 shrink-0" /> : null}
                            {thread ? thread.last.body || (thread.last.media_path ? "Media" : "") : `@${m.username}`}
                          </span>
                          {thread && thread.unread > 0 ? (
                            <span className="shrink-0 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                              {thread.unread}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {activeMember ? (
        <div className={cn("space-y-3", !active && "hidden md:block")}>
          <div className="flex items-center gap-3 rounded-3xl border border-border bg-card px-3 py-2.5">
            <button
              type="button"
              onClick={() => setActive(null)}
              className="rounded-full p-1.5 hover:bg-secondary md:hidden"
              aria-label="Back to inbox"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <Avatar path={activeMember.avatar_url} name={activeMember.full_name} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{activeMember.full_name}</p>
              <p className="truncate text-xs capitalize text-muted-foreground">
                @{activeMember.username} · {activeMember.status === "pending" ? "waiting list" : activeMember.chat_category}
              </p>
            </div>
          </div>
          <ChatThread memberId={activeMember.id} currentUserId={user!.id} isAdmin canSend />
        </div>
      ) : (
        <div className="card-soft hidden items-center justify-center p-10 text-sm text-muted-foreground md:flex">
          Select a member to open the conversation.
        </div>
      )}
    </div>
  );
}

function Avatar({ path, name }: { path: string | null; name: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setUrl(null);
    if (path) void signedUrl("avatars", path).then((u) => active && setUrl(u));
    return () => {
      active = false;
    };
  }, [path]);
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-sm font-semibold text-muted-foreground">
      {url ? <img src={url} alt={name} className="h-full w-full object-cover" /> : name.charAt(0).toUpperCase()}
    </span>
  );
}