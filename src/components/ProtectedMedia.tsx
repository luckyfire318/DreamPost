import { useEffect, useState } from "react";
import { signedUrl, type Bucket } from "@/lib/media";
import { cn } from "@/lib/utils";

type Props = {
  bucket: Bucket;
  path: string;
  type?: string | null;
  className?: string;
  alt?: string;
  allowDownload?: boolean;
};

export function ProtectedMedia({ bucket, path, type, className, alt, allowDownload }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void signedUrl(bucket, path).then((u) => active && setUrl(u));
    return () => {
      active = false;
    };
  }, [bucket, path]);

  if (!url) {
    return <div className={cn("animate-pulse rounded-xl bg-muted", className)} />;
  }

  const isVideo = (type ?? "").startsWith("video");

  return (
    <div
      className={cn("relative overflow-hidden rounded-xl bg-muted", className)}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {isVideo ? (
        <video
          src={url}
          controls
          controlsList={allowDownload ? undefined : "nodownload noplaybackrate"}
          disablePictureInPicture={!allowDownload}
          className="h-full w-full object-cover"
        />
      ) : (
        <img src={url} alt={alt ?? "Shared media"} className="protected-media h-full w-full object-cover" />
      )}
      {allowDownload ? (
        <a
          href={url}
          download
          className="absolute bottom-2 right-2 rounded-full bg-background/85 px-3 py-1 text-xs font-medium text-foreground shadow"
        >
          Download
        </a>
      ) : null}
    </div>
  );
}