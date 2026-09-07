export type ThemeId =
  | "blush"
  | "lavender"
  | "mint"
  | "peach"
  | "sky"
  | "sage"
  | "butter"
  | "lilac"
  | "rose"
  | "sand"
  | "oled";

export const THEMES: { id: ThemeId; name: string; swatch: string[] }[] = [
  { id: "blush", name: "Blush", swatch: ["#fdf3f2", "#f7d4d0", "#e58b86"] },
  { id: "lavender", name: "Lavender", swatch: ["#f5f2fb", "#ded4f2", "#9d84d6"] },
  { id: "mint", name: "Mint", swatch: ["#f0f9f4", "#c9e9d8", "#67b394"] },
  { id: "peach", name: "Peach", swatch: ["#fdf4ec", "#f8d9bd", "#eb9a63"] },
  { id: "sky", name: "Sky", swatch: ["#eef4fb", "#cfdff4", "#6f92d0"] },
  { id: "sage", name: "Sage", swatch: ["#f2f6ef", "#d5e3cd", "#7fa373"] },
  { id: "butter", name: "Butter", swatch: ["#fdf8e7", "#f6e7ae", "#d9b558"] },
  { id: "lilac", name: "Lilac", swatch: ["#fbf1f9", "#eed2ea", "#c07ab5"] },
  { id: "rose", name: "Rose", swatch: ["#fdf1f3", "#f6ced7", "#d76a86"] },
  { id: "sand", name: "Sand", swatch: ["#f8f5ef", "#e6ded0", "#a08a68"] },
  { id: "oled", name: "OLED Black", swatch: ["#000000", "#161616", "#e879c0"] },
];

export const DEFAULT_THEME: ThemeId = "blush";

export type ThemeMode = "light" | "dark";
export const DEFAULT_MODE: ThemeMode = "light";
const MODE_KEY = "dreampost-mode";

export function storedMode(): ThemeMode {
  if (typeof window === "undefined") return DEFAULT_MODE;
  try {
    const v = localStorage.getItem(MODE_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    /* ignore */
  }
  return DEFAULT_MODE;
}

export function applyTheme(theme: string | null | undefined, mode?: ThemeMode) {
  if (typeof document === "undefined") return;
  const id = THEMES.some((t) => t.id === theme) ? theme! : DEFAULT_THEME;
  const m = mode ?? storedMode();
  document.documentElement.dataset["theme"] = id;
  // OLED is inherently a dark theme; every pastel theme has a dark variant.
  if (id === "oled" || m === "dark") document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
  try {
    localStorage.setItem("dreampost-theme", id);
    localStorage.setItem(MODE_KEY, m);
  } catch {
    /* ignore */
  }
}

export function applyMode(mode: ThemeMode) {
  applyTheme(storedTheme(), mode);
}

export function storedTheme(): ThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const v = localStorage.getItem("dreampost-theme");
    if (v && THEMES.some((t) => t.id === v)) return v as ThemeId;
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME;
}