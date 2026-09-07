import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { applyTheme, storedTheme } from "@/lib/themes";

export type Profile = {
  id: string;
  full_name: string;
  username: string;
  email: string;
  dob: string | null;
  avatar_url: string | null;
  chat_bg_url: string | null;
  theme: string;
  status: "pending" | "approved" | "suspended";
  post_restricted: boolean;
  message_restricted: boolean;
  details_locked: boolean;
  created_at: string;
};

type SessionValue = {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionValue>({
  user: null,
  profile: null,
  isAdmin: false,
  loading: true,
  refresh: async () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load(currentUser: User | null) {
    if (!currentUser) {
      setProfile(null);
      setIsAdmin(false);
      applyTheme(storedTheme());
      setLoading(false);
      return;
    }
    try {
      const [{ data: prof }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", currentUser.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", currentUser.id),
      ]);
      setProfile((prof as Profile) ?? null);
      const admin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
      setIsAdmin(admin);
      applyTheme((prof as Profile)?.theme ?? storedTheme());
    } catch (err) {
      console.error("[session] failed to load profile", err);
      applyTheme(storedTheme());
    } finally {
      // Never leave the app stuck on a blank loading screen.
      setLoading(false);
    }
  }

  async function refresh() {
    const { data } = await supabase.auth.getUser();
    setUser(data.user ?? null);
    await load(data.user ?? null);
  }

  useEffect(() => {
    applyTheme(storedTheme());
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setUser(data.session?.user ?? null);
        void load(data.session?.user ?? null);
      })
      .catch((err) => {
        console.error("[session] getSession failed", err);
        if (active) setLoading(false);
      });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setUser(session?.user ?? null);
      void load(session?.user ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SessionContext.Provider value={{ user, profile, isAdmin, loading, refresh }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}