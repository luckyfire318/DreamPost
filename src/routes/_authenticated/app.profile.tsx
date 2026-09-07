import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, ImagePlus, LogOut, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CropDialog } from "@/components/CropDialog";
import { ThemePicker } from "@/components/ThemePicker";
import { supabase } from "@/integrations/supabase/client";
import { signedUrl, uploadFile } from "@/lib/media";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/app/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — DreamPost" },
      { name: "description", content: "Manage your DreamPost profile photo, details and app theme." },
      { property: "og:title", content: "Your profile — DreamPost" },
      { property: "og:description", content: "Manage your profile photo, details and app theme." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, refresh } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [theme, setTheme] = useState("blush");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [chatBg, setChatBg] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [bgCropSrc, setBgCropSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name);
    setDob(profile.dob ?? "");
    setTheme(profile.theme);
    if (profile.avatar_url) void signedUrl("avatars", profile.avatar_url).then(setAvatar);
    if (profile.chat_bg_url) void signedUrl("avatars", profile.chat_bg_url).then(setChatBg);
    else setChatBg(null);
  }, [profile]);

  if (!user || !profile) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const locked = profile.details_locked;

  async function saveDetails() {
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, dob: dob || null, theme })
      .eq("id", user!.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Profile updated");
      await refresh();
      void qc.invalidateQueries();
    }
  }

  async function uploadAvatar(blob: Blob) {
    const path = `${user!.id}/avatar-${Date.now()}.jpg`;
    try {
      await uploadFile("avatars", path, blob, "image/jpeg");
      const { error } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", user!.id);
      if (error) throw new Error(error.message);
      setAvatar(await signedUrl("avatars", path));
      toast.success("Profile photo updated");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setCropSrc(null);
    }
  }

  async function pickTheme(next: string) {
    setTheme(next);
    const { error } = await supabase.from("profiles").update({ theme: next }).eq("id", user!.id);
    if (error) toast.error(error.message);
    else await refresh();
  }

  async function uploadChatBg(blob: Blob) {
    const path = `${user!.id}/chat-bg-${Date.now()}.jpg`;
    try {
      await uploadFile("avatars", path, blob, "image/jpeg");
      const { error } = await supabase.from("profiles").update({ chat_bg_url: path }).eq("id", user!.id);
      if (error) throw new Error(error.message);
      setChatBg(await signedUrl("avatars", path));
      toast.success("Chat background updated");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBgCropSrc(null);
    }
  }

  async function clearChatBg() {
    const { error } = await supabase.from("profiles").update({ chat_bg_url: null }).eq("id", user!.id);
    if (error) toast.error(error.message);
    else {
      setChatBg(null);
      toast.success("Chat background removed");
      await refresh();
    }
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="space-y-6">
      <div className="card-soft flex flex-col items-center gap-4 p-6 text-center">
        <div className="relative">
          <div className="h-24 w-24 overflow-hidden rounded-full bg-secondary">
            {avatar ? (
              <img src={avatar} alt="Your profile" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-muted-foreground">
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <label className="absolute -bottom-1 -right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
            <Camera className="h-4 w-4" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setCropSrc(URL.createObjectURL(f));
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <div>
          <h1 className="text-xl font-semibold">{profile.full_name}</h1>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
        </div>
        <Badge
          variant={profile.status === "approved" ? "default" : "secondary"}
          className="rounded-full px-3 py-1"
        >
          {profile.status === "approved" ? (
            <>
              <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Verified member
            </>
          ) : profile.status === "suspended" ? (
            "Account suspended"
          ) : (
            "Awaiting admin approval"
          )}
        </Badge>
      </div>

      <section className="card-soft space-y-4 p-6">
        <h2 className="text-lg font-semibold">Your details</h2>
        {locked ? (
          <p className="text-xs text-muted-foreground">
            Your details are locked because your profile has been verified.
          </p>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" value={fullName} disabled={locked} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dobf">Date of birth</Label>
          <Input id="dobf" type="date" value={dob} disabled={locked} onChange={(e) => setDob(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mail">Gmail</Label>
          <Input id="mail" value={profile.email} disabled />
        </div>
      </section>

      <section className="card-soft space-y-4 p-6">
        <h2 className="text-lg font-semibold">App theme</h2>
        <ThemePicker value={theme} onChange={(t) => void pickTheme(t)} />
      </section>

      <section className="card-soft space-y-4 p-6">
        <h2 className="text-lg font-semibold">Chat background</h2>
        <p className="text-xs text-muted-foreground">
          Upload any picture to use as the wallpaper behind your chat with the admin.
        </p>
        <div className="h-40 w-full overflow-hidden rounded-2xl bg-secondary">
          {chatBg ? (
            <img src={chatBg} alt="Your chat background" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No background yet
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full bg-linear-to-r from-brand-from to-brand-to px-4 text-sm font-medium text-primary-foreground shadow-md">
            <ImagePlus className="h-4 w-4" /> Upload image
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setBgCropSrc(URL.createObjectURL(f));
                e.target.value = "";
              }}
            />
          </label>
          {chatBg ? (
            <Button variant="outline" className="rounded-full" onClick={() => void clearChatBg()}>
              <Trash2 className="mr-2 h-4 w-4" /> Remove
            </Button>
          ) : null}
        </div>
      </section>

      <div className="flex flex-col gap-3">
        <Button onClick={saveDetails} disabled={busy} className="rounded-full">
          {busy ? "Saving…" : "Save changes"}
        </Button>
        <Button variant="outline" onClick={signOut} className="rounded-full">
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
      </div>

      <CropDialog
        open={!!cropSrc}
        src={cropSrc}
        aspect={1}
        title="Crop profile photo"
        onCancel={() => setCropSrc(null)}
        onDone={uploadAvatar}
      />

      <CropDialog
        open={!!bgCropSrc}
        src={bgCropSrc}
        aspect={0}
        title="Crop chat background"
        onCancel={() => setBgCropSrc(null)}
        onDone={uploadChatBg}
      />
    </div>
  );
}