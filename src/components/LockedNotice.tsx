import { Lock } from "lucide-react";

export function LockedNotice({ title, description }: { title: string; description: string }) {
  return (
    <div className="card-soft flex flex-col items-center gap-3 p-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
        <Lock className="h-5 w-5 text-secondary-foreground" />
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}