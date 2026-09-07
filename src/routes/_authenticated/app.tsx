import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { Home, MessageCircle, User } from "lucide-react";
import logo from "@/assets/dreampost_logo.png.asset.json";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app")({
  component: MemberShell,
});

const NAV = [
  { to: "/app/feed", label: "Community", icon: Home },
  { to: "/app/chat", label: "Chat", icon: MessageCircle },
  { to: "/app/profile", label: "Profile", icon: User },
] as const;

function MemberShell() {
  const { isAdmin, loading } = useSession();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && isAdmin) void navigate({ to: "/admin/posts", replace: true });
  }, [loading, isAdmin, navigate]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-2xl items-center justify-between px-4">
          <img src={logo.url} alt="DreamPost" className="h-12 sm:h-14" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-stretch">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}