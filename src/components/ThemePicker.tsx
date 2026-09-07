import { useEffect, useState } from "react";
import { THEMES, applyTheme, applyMode, storedMode, type ThemeMode } from "@/lib/themes";
import { cn } from "@/lib/utils";
import { Check, Moon, Sun } from "lucide-react";

export function ThemePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (theme: string) => void;
}) {
  const [mode, setMode] = useState<ThemeMode>("light");
  useEffect(() => setMode(storedMode()), []);

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-2xl border border-border bg-muted/50 p-1">
        {(["light", "dark"] as ThemeMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              applyMode(m);
            }}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium capitalize transition-colors",
              mode === m
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {m}
          </button>
        ))}
      </div>
      {value === "oled" ? (
        <p className="text-xs text-muted-foreground">OLED Black is always dark.</p>
      ) : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {THEMES.map((theme) => (
        <button
          key={theme.id}
          type="button"
          onClick={() => {
            applyTheme(theme.id, mode);
            onChange(theme.id);
          }}
          className={cn(
            "flex items-center gap-3 rounded-2xl border p-3 text-left transition-all hover:shadow-md",
            value === theme.id ? "border-primary ring-2 ring-ring/40" : "border-border",
          )}
        >
          <span className="flex -space-x-1.5">
            {theme.swatch.map((c) => (
              <span
                key={c}
                className="h-6 w-6 rounded-full border border-black/10"
                style={{ backgroundColor: c }}
              />
            ))}
          </span>
          <span className="flex-1 text-sm font-medium">{theme.name}</span>
          {value === theme.id ? <Check className="h-4 w-4 text-primary" /> : null}
        </button>
      ))}
      </div>
    </div>
  );
}