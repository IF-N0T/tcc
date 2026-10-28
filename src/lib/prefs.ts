// Preferências visuais guardadas no navegador (localStorage).
export const PREFS_KEY = "sherlock-prefs";

export type Prefs = {
  mode: "dark" | "light" | "system";
  accent: "gold" | "blue" | "green" | "wine" | "violet";
  font: "sm" | "md" | "lg";
  motion: "full" | "reduce";
  contrast: "normal" | "high";
};

export const DEFAULT_PREFS: Prefs = { mode: "dark", accent: "gold", font: "md", motion: "full", contrast: "normal" };

export const ACCENTS: { id: Prefs["accent"]; label: string; swatch: string }[] = [
  { id: "gold", label: "Latão", swatch: "#b98d36" },
  { id: "blue", label: "Azul-aço", swatch: "#3b77ba" },
  { id: "green", label: "Musgo", swatch: "#3e8662" },
  { id: "wine", label: "Vinho", swatch: "#bd3a55" },
  { id: "violet", label: "Violeta", swatch: "#825bc4" }
];

export function readPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
    if (localStorage.getItem("sherlock-theme") === "light") return { ...DEFAULT_PREFS, mode: "light" };
  } catch {}
  return DEFAULT_PREFS;
}

export function applyPrefs(p: Prefs) {
  const root = document.documentElement;
  const dark = p.mode === "dark" || (p.mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
  root.classList.toggle("light", !dark);
  root.dataset.accent = p.accent;
  root.dataset.font = p.font;
  root.dataset.motion = p.motion;
  root.dataset.contrast = p.contrast;
}

export function savePrefs(p: Prefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch {}
  applyPrefs(p);
}

/** Script executado antes da pintura para evitar "flash" de tema. */
export const THEME_INIT_SCRIPT = `(function(){try{var d={mode:"dark",accent:"gold",font:"md",motion:"full",contrast:"normal"};var p=d;var r=localStorage.getItem("${PREFS_KEY}");if(r){p=Object.assign({},d,JSON.parse(r))}else if(localStorage.getItem("sherlock-theme")==="light"){p.mode="light"}
var dark=p.mode==="dark"||(p.mode==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement;e.className=dark?"dark":"light";e.dataset.accent=p.accent;e.dataset.font=p.font;e.dataset.motion=p.motion;e.dataset.contrast=p.contrast;if(localStorage.getItem("sherlock-sidebar")==="collapsed")e.dataset.sidebar="collapsed"}catch(e){}})();`;
