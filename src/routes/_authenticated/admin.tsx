import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { Images, MessagesSquare, Settings, Users } from "lucide-react";
import logo from "@/assets/dreampost_logo.png.asset.json";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminShell,
});

const NAV = [
  { to: "/admin/posts", label: "Posts", icon: Images },
  { to: "/admin/chats", label: "Chats", icon: MessagesSquare },
  { to: "/admin/members", label: "Members", icon: Users },
  { to: "/admin/settings", label: "Admin", icon: Settings },
] as const;

function AdminShell() {
  const { isAdmin, loading } = useSession();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !isAdmin) void navigate({ to: "/app/feed", replace: true });
  }, [loading, isAdmin, navigate]);

  if (loading || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="text-sm">{loading ? "Loading admin panel…" : "Redirecting…"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <img src={logo.url} alt="DreamPost" className="h-12 sm:h-14" />
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">Admin panel</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-6">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-stretch">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                pathname.startsWith(item.to) ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}