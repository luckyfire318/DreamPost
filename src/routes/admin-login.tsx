import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { signInWithIdentifier } from "@/lib/auth.functions";

export const Route = createFileRoute("/admin-login")({
  head: () => ({
    meta: [
      { title: "Admin sign in — DreamPost" },
      { name: "description", content: "Administrator access to the DreamPost community panel." },
      { property: "og:title", content: "Admin sign in — DreamPost" },
      { property: "og:description", content: "Administrator access to the DreamPost panel." },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const session = await signInWithIdentifier({ data: { identifier: username, password } });
      const { error } = await supabase.auth.setSession(session);
      if (error) throw new Error("Wrong user id or password");
      await navigate({ to: "/admin/posts", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="card-soft w-full max-w-sm space-y-5 p-7">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="brand-gradient flex h-12 w-12 items-center justify-center rounded-2xl">
            <ShieldCheck className="h-6 w-6 text-white" />
          </span>
          <h1 className="text-xl font-semibold">Admin access</h1>
          <p className="text-sm text-muted-foreground">Sign in with your admin credentials.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin-user">User id</Label>
          <Input
            id="admin-user"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="@yourid"
            autoComplete="username"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin-pass">Password</Label>
          <Input
            id="admin-pass"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <Button type="submit" className="w-full rounded-full" disabled={busy}>
          {busy ? "Signing in…" : "Enter panel"}
        </Button>
        <Link to="/auth" className="block text-center text-xs text-muted-foreground hover:underline">
          Member sign in instead
        </Link>
      </form>
    </main>
  );
}