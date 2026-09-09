import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export const ADMIN_EMAIL_DOMAIN = "dreampost.admin";

const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(120),
  password: z.string().min(1).max(72),
});

function publishableClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function bootstrapAdminIfNeeded(handle: string, password: string): Promise<string | null> {
  const bootUser = (process.env["ADMIN_BOOTSTRAP_USERNAME"] ?? "").replace(/^@+/, "").toLowerCase();
  const bootPass = process.env["ADMIN_BOOTSTRAP_PASSWORD"] ?? "";
  if (!bootUser || !bootPass) return null;
  if (handle !== bootUser || password !== bootPass) return null;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  if (count) return null;

  const email = `${bootUser}@${ADMIN_EMAIL_DOMAIN}`;
  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: bootPass,
    email_confirm: true,
  });
  if (error || !created.user) throw new Error("Could not prepare the admin account");
  await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: "admin" });
  await supabaseAdmin.from("profiles").insert({
    id: created.user.id,
    full_name: "DreamPost Admin",
    username: bootUser,
    login_username: bootUser,
    email,
    status: "approved",
    details_locked: true,
    accepted_terms: true,
  });
  return email;
}

/**
 * Signs in with a username or email. Username resolution uses the same normalized
 * login_username field maintained in public.profiles. Email login uses Supabase Auth directly.
 */
export const signInWithIdentifier = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => loginSchema.parse(input))
  .handler(async ({ data }) => {
    const raw = data.identifier.trim();
    const handle = raw.replace(/^@+/, "").toLowerCase();
    const candidates: string[] = [];

    if (raw.includes("@") && !raw.startsWith("@")) {
      candidates.push(raw.toLowerCase());
    } else {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("login_username", handle)
        .maybeSingle();
      if (profile?.email) candidates.push(profile.email);
      const bootstrapped = await bootstrapAdminIfNeeded(handle, data.password);
      if (bootstrapped) candidates.push(bootstrapped);
      candidates.push(`${handle}@${ADMIN_EMAIL_DOMAIN}`);
    }

    const client = publishableClient();
    for (const email of candidates) {
      const { data: signed, error } = await client.auth.signInWithPassword({
        email,
        password: data.password,
      });
      if (!error && signed.session) {
        return {
          access_token: signed.session.access_token,
          refresh_token: signed.session.refresh_token,
        };
      }
    }
    throw new Error("Wrong username or password");
  });

const credentialsSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .transform((v) => v.replace(/^@+/, "").toLowerCase())
    .refine((v) => /^[a-z0-9._-]+$/.test(v), "Only letters, numbers, dot, dash and underscore"),
  password: z.string().min(8).max(72).optional(),
});

export const updateAdminCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => credentialsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = `${data.username}@${ADMIN_EMAIL_DOMAIN}`;
    const { error } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      email,
      email_confirm: true,
      ...(data.password ? { password: data.password } : {}),
    });
    if (error) throw new Error(error.message);

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ username: data.username, login_username: data.username, email })
      .eq("id", context.userId);
    if (profileError) throw new Error(profileError.message);

    return { username: data.username, email };
  });

const usernameSchema = z.object({ username: z.string().trim().min(3).max(40) });

export const isUsernameAvailable = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => usernameSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("login_username", data.username.replace(/^@+/, "").toLowerCase())
      .maybeSingle();
    return { available: !existing };
  });
