"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Contrast, Monitor, Moon, Palette, Sun } from "lucide-react";
import { ACCENTS, DEFAULT_PREFS, applyPrefs, readPrefs, savePrefs, type Prefs } from "@/lib/prefs";

export default function ThemeMenu() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => { setPrefs(readPrefs()); }, []);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);
  // Modo "sistema": acompanha mudanças do sistema operacional.
  useEffect(() => {
    if (prefs.mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => applyPrefs(prefs);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [prefs]);

  function set<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    savePrefs(next);
  }

  const Mode = prefs.mode === "light" ? Sun : prefs.mode === "system" ? Monitor : Moon;

  return (
    <div className="relative" ref={box}>
      <button type="button" className="btn-secondary !px-2.5" aria-haspopup="dialog" aria-expanded={open} aria-label="Aparência" title="Aparência" onClick={() => setOpen((o) => !o)}>
        <Mode size={16} aria-hidden="true" /><Palette size={16} aria-hidden="true" className="hidden sm:block" />
      </button>

      {open && (
        <div role="dialog" aria-label="Opções de aparência" className="card rise absolute right-0 z-50 mt-2 w-[min(92vw,320px)] p-4">
          <div className="eyebrow mb-2">Modo</div>
          <div className="grid grid-cols-3 gap-2">
            {([["light", "Claro", Sun], ["dark", "Escuro", Moon], ["system", "Sistema", Monitor]] as const).map(([id, label, Icon]) => (
              <button key={id} type="button" onClick={() => set("mode", id)} aria-pressed={prefs.mode === id}
                className={`flex flex-col items-center gap-1.5 rounded-lg border p-2.5 text-xs transition ${prefs.mode === id ? "border-brand-500 bg-brand-500/10 text-gray-900" : "border-gray-200 text-gray-600 hover:bg-gray-100"}`}>
                <Icon size={18} aria-hidden="true" />{label}
              </button>
            ))}
          </div>

          <div className="eyebrow mb-2 mt-4">Cor de destaque</div>
          <div className="flex flex-wrap gap-2">
            {ACCENTS.map((a) => (
              <button key={a.id} type="button" onClick={() => set("accent", a.id)} aria-label={a.label} title={a.label} aria-pressed={prefs.accent === a.id}
                className="flex h-8 w-8 items-center justify-center rounded-full ring-offset-2 transition hover:scale-110" style={{ background: a.swatch, outline: prefs.accent === a.id ? `2px solid ${a.swatch}` : "none", outlineOffset: 2 }}>
                {prefs.accent === a.id && <Check size={15} className="text-white" aria-hidden="true" />}
              </button>
            ))}
          </div>

          <div className="eyebrow mb-2 mt-4">Tamanho do texto</div>
          <div className="seg w-full [&>button]:flex-1">
            {([["sm", "Menor"], ["md", "Padrão"], ["lg", "Maior"]] as const).map(([id, label]) => (
              <button key={id} type="button" aria-pressed={prefs.font === id} onClick={() => set("font", id)}>{label}</button>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-gray-700">
              <span className="flex items-center gap-2"><Contrast size={15} aria-hidden="true" /> Alto contraste</span>
              <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--brand-500))]" checked={prefs.contrast === "high"} onChange={(e) => set("contrast", e.target.checked ? "high" : "normal")} />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-gray-700">
              <span>Reduzir animações</span>
              <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--brand-500))]" checked={prefs.motion === "reduce"} onChange={(e) => set("motion", e.target.checked ? "reduce" : "full")} />
            </label>
          </div>
          <button type="button" className="btn-ghost mt-3 w-full !text-xs" onClick={() => { setPrefs(DEFAULT_PREFS); savePrefs(DEFAULT_PREFS); }}>Restaurar padrão</button>
        </div>
      )}
    </div>
  );
}
