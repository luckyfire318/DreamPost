import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { ChevronRight, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { signedUrl } from "@/lib/media";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/members")({
  head: () => ({
    meta: [
      { title: "Members — DreamPost admin" },
      { name: "description", content: "Approve, restrict and suspend DreamPost members." },
      { property: "og:title", content: "Members — DreamPost admin" },
      { property: "og:description", content: "Approve, restrict and suspend members." },
    ],
  }),
  component: AdminMembers,
});

type Member = {
  id: string;
  full_name: string;
  username: string;
  email: string;
  dob: string | null;
  avatar_url: string | null;
  status: "pending" | "approved" | "suspended";
  post_restricted: boolean;
  message_restricted: boolean;
  details_locked: boolean;
  chat_category: "primary" | "general";
  created_at: string;
};

type MemberPatch = {
  status?: "pending" | "approved" | "suspended";
  post_restricted?: boolean;
  message_restricted?: boolean;
  details_locked?: boolean;
  chat_category?: "primary" | "general";
};

function statusColor(status: Member["status"]) {
  if (status === "approved") return "bg-emerald-500/15 text-emerald-600";
  if (status === "suspended") return "bg-rose-500/15 text-rose-600";
  return "bg-amber-500/15 text-amber-600";
}

function AdminMembers() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Member | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const { data: members } = useQuery({
    queryKey: ["members-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Member[];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: MemberPatch }) => {
      const { error } = await supabase.from("profiles").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["members-full"] });
      void qc.invalidateQueries({ queryKey: ["members"] });
      toast.success("Member updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  // keep the open sheet in sync with the latest server state
  const current = selected
    ? (members ?? []).find((m) => m.id === selected.id) ?? selected
    : null;

  async function openMember(m: Member) {
    setSelected(m);
    setAvatarUrl(null);
    if (m.avatar_url) void signedUrl("avatars", m.avatar_url).then(setAvatarUrl);
  }

  function patchSelected(patch: MemberPatch) {
    if (!current) return;
    update.mutate({ id: current.id, patch });
  }

  const all = members ?? [];
  const q = query.trim().toLowerCase();
  const list = q
    ? all.filter((m) =>
        [m.full_name, m.username, m.email].some((v) => (v ?? "").toLowerCase().includes(q)),
      )
    : all;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Members</h1>
        <span className="text-xs text-muted-foreground">{list.length} of {all.length}</span>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, username or email"
          className="rounded-full pl-11"
        />
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {all.length === 0 ? "No members have signed up yet." : "No members match your search."}
        </p>
      ) : (
        <ul className="card-soft divide-y divide-border overflow-hidden">
          {list.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => openMember(m)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-sm font-semibold text-muted-foreground">
                  {m.avatar_url ? (
                    <AvatarThumb path={m.avatar_url} fallback={m.full_name} />
                  ) : (
                    m.full_name.charAt(0).toUpperCase()
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{m.full_name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    @{m.username} · {m.email}
                  </span>
                </span>
                <span className="hidden shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold capitalize text-muted-foreground sm:inline">
                  {m.chat_category}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize",
                    statusColor(m.status),
                  )}
                >
                  {m.status}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={!!current} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
          {current ? (
            <>
              <SheetHeader className="bg-linear-to-r from-brand-from to-brand-to px-6 pb-6 pt-8 text-primary-foreground">
                <div className="flex items-center gap-4">
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 text-xl font-semibold">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={current.full_name} className="h-full w-full object-cover" />
                    ) : (
                      current.full_name.charAt(0).toUpperCase()
                    )}
                  </span>
                  <div className="min-w-0">
                    <SheetTitle className="truncate text-primary-foreground">{current.full_name}</SheetTitle>
                    <SheetDescription className="truncate text-primary-foreground/80">
                      @{current.username}
                    </SheetDescription>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge
                    variant={current.status === "approved" ? "default" : "secondary"}
                    className="rounded-full bg-white/20 capitalize text-primary-foreground"
                  >
                    {current.status}
                  </Badge>
                  {current.details_locked ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
                      <ShieldCheck className="h-3.5 w-3.5" /> Verified
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold capitalize text-primary-foreground">
                    {current.chat_category} chat
                  </span>
                </div>
              </SheetHeader>

              <div className="flex-1 space-y-6 p-6">
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Profile details
                  </h3>
                  <dl className="divide-y divide-border rounded-2xl bg-secondary/40 text-sm">
                    <DetailRow label="Email" value={current.email} />
                    <DetailRow
                      label="Date of birth"
                      value={current.dob ? format(new Date(current.dob), "d MMM yyyy") : "—"}
                    />
                    <DetailRow
                      label="Joined"
                      value={format(new Date(current.created_at), "d MMM yyyy, h:mm a")}
                    />
                    <DetailRow
                      label="Username"
                      value={`@${current.username}`}
                    />
                  </dl>
                </section>

                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Chat classification
                  </h3>
                  <div className="flex gap-2 rounded-full bg-secondary/40 p-1">
                    {(["primary", "general"] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => patchSelected({ chat_category: c })}
                        className={cn(
                          "flex-1 rounded-full px-4 py-2 text-sm font-semibold capitalize transition-colors",
                          current.chat_category === c
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-secondary",
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  {current.status === "pending" ? (
                    <p className="text-xs text-muted-foreground">
                      This member is on the waiting list. Once approved they move to the{" "}
                      {current.chat_category} inbox.
                    </p>
                  ) : null}
                </section>

                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Restrictions
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-2xl bg-secondary/40 px-4 py-3">
                      <Label htmlFor="post-r" className="text-sm">Community post restriction</Label>
                      <Switch
                        id="post-r"
                        checked={current.post_restricted}
                        onCheckedChange={(v) => patchSelected({ post_restricted: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-secondary/40 px-4 py-3">
                      <Label htmlFor="msg-r" className="text-sm">Send message restriction</Label>
                      <Switch
                        id="msg-r"
                        checked={current.message_restricted}
                        onCheckedChange={(v) => patchSelected({ message_restricted: v })}
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Account status
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {current.status !== "approved" ? (
                      <Button
                        size="sm"
                        className="rounded-full"
                        onClick={() => patchSelected({ status: "approved", details_locked: true })}
                      >
                        Approve member
                      </Button>
                    ) : null}
                    {current.status !== "suspended" ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="rounded-full"
                        onClick={() => patchSelected({ status: "suspended" })}
                      >
                        Suspend account
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => patchSelected({ status: "approved" })}
                      >
                        Reinstate
                      </Button>
                    )}
                    {current.status === "approved" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => patchSelected({ status: "pending", details_locked: false })}
                      >
                        Move back to pending
                      </Button>
                    ) : null}
                  </div>
                </section>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium text-right">{value}</dd>
    </div>
  );
}

function AvatarThumb({ path, fallback }: { path: string; fallback: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void signedUrl("avatars", path).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [path]);
  if (!url) return <span>{fallback.charAt(0).toUpperCase()}</span>;
  return <img src={url} alt={fallback} className="h-full w-full object-cover" />;
}
