import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

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
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !password) return;
    setBusy(true);
    try {
      const raw = identifier.trim();
      let email = raw.toLowerCase();
      if (!raw.includes("@")) {
        const { data, error } = await supabase.rpc("resolve_login_email", { p_username: raw });
        if (error || !data) throw new Error("Wrong username or password");
        email = data;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error("Wrong username or password");
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
          <Label htmlFor="admin-user">Username or email</Label>
          <Input id="admin-user" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Username or email" autoComplete="username" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin-pass">Password</Label>
          <Input id="admin-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
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
