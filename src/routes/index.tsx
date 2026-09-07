import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Heart, Lock, MessagesSquare, Sparkles } from "lucide-react";
import logo from "@/assets/dreampost_logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DreamPost — Private community for shared ideas" },
      {
        name: "description",
        content:
          "Join DreamPost: an approval-based private community where the admin shares ideas and members react, comment and chat directly.",
      },
      { property: "og:title", content: "DreamPost — Private community for shared ideas" },
      {
        property: "og:description",
        content: "An approval-based private community for ideas, media and one-to-one chat.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, isAdmin, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      void navigate({ to: isAdmin ? "/admin/posts" : "/app/feed", replace: true });
    }
  }, [loading, user, isAdmin, navigate]);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-10 px-6 py-16 text-center">
        <img src={logo.url} alt="DreamPost logo" className="w-80 max-w-full" />

        <div className="space-y-4">
          <h1 className="text-4xl font-semibold sm:text-5xl">
            A quiet place for <span className="text-brand-gradient">shared ideas</span>
          </h1>
          <p className="mx-auto max-w-md text-base text-muted-foreground">
            DreamPost is a private community. The admin posts ideas, photos and videos — members
            react, comment privately and chat one-to-one.
          </p>
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-3">
          {[
            { icon: Sparkles, label: "Curated posts" },
            { icon: Heart, label: "Private reactions" },
            { icon: MessagesSquare, label: "Direct chat" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="card-soft flex flex-col items-center gap-2 p-5">
              <Icon className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button asChild size="lg" className="rounded-full px-8">
            <Link to="/auth">Member sign in</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full px-8">
            <Link to="/admin-login">
              <Lock className="mr-2 h-4 w-4" /> Admin
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
