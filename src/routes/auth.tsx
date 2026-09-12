import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { isUsernameAvailable, signInWithIdentifier } from "@/lib/auth.functions";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or join — DreamPost" },
      {
        name: "description",
        content:
          "Sign in to DreamPost with your username or email, or create an account with your Gmail address and wait for admin approval.",
      },
    ],
  }),
  component: AuthPage,
});

const strongPassword = z
  .string()
  .min(8, "Use at least 8 characters")
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/[0-9]/, "Add a number")
  .regex(/[^A-Za-z0-9]/, "Add a symbol");

const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username needs 3+ characters")
  .max(30)
  .regex(/^[a-zA-Z0-9._-]+$/, "Letters, numbers, dot, dash, underscore only");

const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(80),
    username: usernameSchema,
    dob: z.string().min(1, "Enter your date of birth"),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid email")
      .refine((v) => v.endsWith("@gmail.com"), "Sign up requires a Gmail address"),
    password: strongPassword,
    confirm: z.string(),
    terms: z.literal(true, { errorMap: () => ({ message: "Please accept the terms" }) }),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Passwords do not match",
  });

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="pr-11"
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        aria-label={visible ? "Hide password" : "Show password"}
        title={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useSession();

  useEffect(() => {
    if (!loading && user) {
      void navigate({ to: isAdmin ? "/admin/posts" : "/app/feed", replace: true });
    }
  }, [loading, user, isAdmin, navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <Link to="/" className="flex justify-center">
          <img
            src="/dreampost-logo.svg"
            alt="DreamPost"
            className="h-auto w-full max-w-[420px] object-contain"
          />
        </Link>
        <div className="card-soft p-6">
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 rounded-full">
              <TabsTrigger value="login" className="rounded-full">
                Log in
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-full">
                Sign up
              </TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="pt-5">
              <LoginForm />
            </TabsContent>
            <TabsContent value="signup" className="pt-5">
              <SignupForm />
            </TabsContent>
          </Tabs>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Admin?{" "}
          <Link to="/admin-login" className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in here
          </Link>
        </p>
      </div>
    </main>
  );
}

function LoginForm() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const raw = identifier.trim();
    if (!raw || !password) return;

    if (raw.includes("@")) {
      const email = raw.toLowerCase();
      if (!z.string().email().safeParse(email).success) {
        toast.error("Enter a valid email address");
        return;
      }
    }

    setBusy(true);
    try {
      // Resolve usernames on the server, then authenticate through Supabase Auth.
      // This keeps username-to-email lookup out of the browser while preserving
      // normal Supabase password authentication.
      const session = await signInWithIdentifier({ data: { identifier: raw, password } });
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      if (sessionError) throw sessionError;
      await navigate({ to: "/app/feed", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign you in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="identifier">Username or email</Label>
        <Input
          id="identifier"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          autoComplete="username"
          inputMode="email"
          placeholder="Enter username or email"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
      </div>
      <Button type="submit" className="w-full rounded-full" disabled={busy}>
        {busy ? "Signing in…" : "Log in"}
      </Button>
    </form>
  );
}

function SignupForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    dob: "",
    email: "",
    password: "",
    confirm: "",
    terms: false,
  });
  const [busy, setBusy] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = signupSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setBusy(true);
    try {
      const values = parsed.data;
      const username = values.username.replace(/^@+/, "").toLowerCase();
      const availability = await isUsernameAvailable({ data: { username } });
      if (!availability.available) {
        throw new Error("That username is already taken. Please choose another.");
      }
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: values.fullName,
            username,
            dob: values.dob,
            accepted_terms: true,
          },
        },
      });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error("Signup failed, please try again");
      toast.success(
        data.session
          ? "Account created — waiting for admin approval"
          : "Account created. Check your Gmail to confirm your address, then sign in.",
      );
      if (data.session) await navigate({ to: "/app/profile", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create your account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          value={form.username}
          onChange={(e) => set("username", e.target.value.replace(/\s/g, ""))}
          autoComplete="username"
          placeholder="Choose a username"
        />
        <p className="text-xs text-muted-foreground">This username can be used to log in later.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="dob">Date of birth</Label>
          <Input id="dob" type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)} />
        </div>
        <div />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Gmail address</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@gmail.com"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-password">Password</Label>
        <PasswordInput
          id="new-password"
          value={form.password}
          onChange={(value) => set("password", value)}
          autoComplete="new-password"
        />
        <p className="text-xs text-muted-foreground">8+ characters with upper, lower, number and symbol.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirm password</Label>
        <PasswordInput
          id="confirm"
          value={form.confirm}
          onChange={(value) => set("confirm", value)}
          autoComplete="new-password"
        />
      </div>
      <label className="flex items-start gap-3 text-sm text-muted-foreground">
        <Checkbox
          checked={form.terms}
          onCheckedChange={(v) => set("terms", v === true)}
          className="mt-0.5"
        />
        <span>
          I confirm I am willfully using this application and accept the community terms & conditions.
        </span>
      </label>
      <Button type="submit" className="w-full rounded-full" disabled={busy}>
        {busy ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
