import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemePicker } from "@/components/ThemePicker";
import { supabase } from "@/integrations/supabase/client";
import { updateAdminCredentials } from "@/lib/auth.functions";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/admin/settings")({ head: () => ({ meta: [{ title: "Admin settings — DreamPost" }, { name: "description", content: "Update admin credentials, media size limits and app theme." }] }), component: AdminSettings });

function AdminSettings() {
  const { user, profile, refresh } = useSession(); const navigate = useNavigate(); const qc = useQueryClient();
  const [username, setUsername] = useState(""); const [password, setPassword] = useState(""); const [theme, setTheme] = useState("blush");
  const [imageMb, setImageMb] = useState(10); const [videoMb, setVideoMb] = useState(50); const [documentMb, setDocumentMb] = useState(7);
  const { data: limits } = useQuery({ queryKey: ["media-limits"], queryFn: async () => { const { data, error } = await (supabase as any).from("media_limits").select("id,media_type,max_size_mb,enabled"); if (error) throw error; return data ?? []; } });
  useEffect(() => { if (profile) { setUsername(profile.username); setTheme(profile.theme); } }, [profile]);
  useEffect(() => { if (limits) { const v=(type:string, fallback:number)=>Number(limits.find((x:any)=>x.media_type===type)?.max_size_mb ?? fallback); setImageMb(v("image",10)); setVideoMb(v("video",50)); setDocumentMb(v("document",7)); } }, [limits]);
  async function saveCredentials(){ try { await updateAdminCredentials({data:{username,...(password?{password}:{})}}); setPassword(""); toast.success("Admin credentials updated"); await refresh(); } catch(e){toast.error(e instanceof Error?e.message:"Could not update credentials");} }
  async function saveLimits(){ const values=[ ["image",imageMb], ["video",videoMb], ["document",documentMb] ] as const; for(const [media_type,max_size_mb] of values){ const row=limits?.find((x:any)=>x.media_type===media_type); const {error}=row ? await (supabase as any).from("media_limits").update({max_size_mb,enabled:max_size_mb>0}).eq("id",row.id) : await (supabase as any).from("media_limits").insert({media_type,max_size_mb,enabled:max_size_mb>0}); if(error){toast.error(error.message);return;} } await qc.invalidateQueries({queryKey:["media-limits"]}); toast.success("Media limits saved"); }
  async function saveTheme(){ const {error}=await (supabase as any).from("profiles").update({theme}).eq("id",user!.id); if(error){toast.error(error.message);return;} toast.success("Theme saved"); await refresh(); }
  async function signOut(){await qc.cancelQueries();qc.clear();await supabase.auth.signOut();await navigate({to:"/admin-login",replace:true});}
  return <div className="space-y-6"><section className="card-soft space-y-4 p-6"><h1 className="text-xl font-semibold">Admin credentials</h1><div className="space-y-2"><Label htmlFor="adminuser">Admin user id</Label><Input id="adminuser" value={username} onChange={e=>setUsername(e.target.value)}/></div><div className="space-y-2"><Label htmlFor="adminpass">New password</Label><Input id="adminpass" type="password" value={password} placeholder="Leave blank to keep current" onChange={e=>setPassword(e.target.value)}/></div><Button className="rounded-full" onClick={saveCredentials}>Update credentials</Button></section><section className="card-soft space-y-4 p-6"><h2 className="text-lg font-semibold">Media size limits</h2><div className="grid gap-4 sm:grid-cols-3">{([["imgmb","Max image size (MB)",imageMb,setImageMb],["vidmb","Max video size (MB)",videoMb,setVideoMb],["docmb","Max document size (MB)",documentMb,setDocumentMb]] as const).map(([id,label,value,setter])=><div className="space-y-2" key={id}><Label htmlFor={id}>{label}</Label><Input id={id} type="number" min={0} step="any" value={value} onChange={e=>setter(Number(e.target.value))}/></div>)}</div><Button className="rounded-full" onClick={saveLimits}>Save limits</Button></section><section className="card-soft space-y-4 p-6"><h2 className="text-lg font-semibold">App theme</h2><ThemePicker value={theme} onChange={setTheme}/><Button className="rounded-full" onClick={saveTheme}>Save theme</Button></section><Button variant="outline" className="rounded-full" onClick={signOut}><LogOut className="mr-2 h-4 w-4"/>Sign out</Button></div>;
}
