import { supabase } from "@/integrations/supabase/client";

export type Bucket = "avatars" | "post-media" | "chat-media";

const cache = new Map<string, { url: string; expires: number }>();

export async function signedUrl(bucket: Bucket, path: string): Promise<string | null> {
  const key = `${bucket}:${path}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.url;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return null;
  cache.set(key, { url: data.signedUrl, expires: Date.now() + 50 * 60 * 1000 });
  return data.signedUrl;
}

export function fileExt(file: File) {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "bin";
}

export async function uploadFile(bucket: Bucket, path: string, file: Blob, contentType?: string) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: contentType ?? (file instanceof File ? file.type : "application/octet-stream"),
  });
  if (error) throw new Error(error.message);
  return path;
}

export function checkSize(file: File, maxImageMb: number, maxVideoMb: number) {
  const isVideo = file.type.startsWith("video/");
  const limit = (isVideo ? maxVideoMb : maxImageMb) * 1024 * 1024;
  if (file.size > limit) {
    return `${file.name} is too large. Limit is ${isVideo ? maxVideoMb : maxImageMb} MB.`;
  }
  return null;
}