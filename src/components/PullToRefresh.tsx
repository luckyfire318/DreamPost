import { useRef, useState, type ReactNode } from "react";
import { Loader2, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

const THRESHOLD = 70;

/** Lightweight touch pull-to-refresh; guards against concurrent refreshes. */
export function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<unknown>;
  children: ReactNode;
}) {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const startY = useRef<number | null>(null);

  function atTop() {
    return (window.scrollY || document.documentElement.scrollTop) <= 0;
  }

  async function run() {
    if (busy) return;
    setBusy(true);
    try {
      await onRefresh();
    } finally {
      setBusy(false);
      setPull(0);
    }
  }

  return (
    <div
      onTouchStart={(e) => {
        if (busy || !atTop()) return;
        startY.current = e.touches[0]?.clientY ?? null;
      }}
      onTouchMove={(e) => {
        if (startY.current === null || busy) return;
        const y = e.touches[0]?.clientY;
        if (y === undefined) return;
        const delta = y - startY.current;
        if (delta > 0 && atTop()) setPull(Math.min(delta * 0.5, 110));
        else setPull(0);
      }}
      onTouchEnd={() => {
        const shouldRefresh = pull >= THRESHOLD;
        startY.current = null;
        if (shouldRefresh) void run();
        else setPull(0);
      }}
    >
      <div
        className={cn(
          "flex items-center justify-center gap-2 overflow-hidden text-xs text-muted-foreground transition-[height]",
          busy || pull > 0 ? "" : "h-0",
        )}
        style={{ height: busy ? 40 : pull }}
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Refreshing…
          </>
        ) : pull > 0 ? (
          <>
            <ArrowDown className={cn("h-4 w-4 transition-transform", pull >= THRESHOLD && "rotate-180")} />
            {pull >= THRESHOLD ? "Release to refresh" : "Pull to refresh"}
          </>
        ) : null}
      </div>
      {children}
    </div>
  );
}
