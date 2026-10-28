"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { TriangleAlert, CircleCheck, Info, X, CircleX } from "lucide-react";

type ToastKind = "ok" | "error" | "info" | "warn";
type Toast = { id: number; kind: ToastKind; text: string };
type ConfirmOptions = { title: string; message?: string; confirmLabel?: string; danger?: boolean };

const ToastCtx = createContext<(text: string, kind?: ToastKind) => void>(() => {});
const ConfirmCtx = createContext<(o: ConfirmOptions) => Promise<boolean>>(async () => false);

export const useToast = () => useContext(ToastCtx);
export const useConfirm = () => useContext(ConfirmCtx);

const ICON = { ok: CircleCheck, error: CircleX, info: Info, warn: TriangleAlert };
const TONE = { ok: "text-green-500", error: "text-red-500", info: "text-blue-500", warn: "text-amber-500" };

export default function Providers({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const seq = useRef(0);
  const okBtn = useRef<HTMLButtonElement>(null);

  const toast = useCallback((text: string, kind: ToastKind = "info") => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-3), { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 6500 : 3800);
  }, []);

  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>((resolve) => setDialog({ ...o, resolve })), []);
  const close = (v: boolean) => { dialog?.resolve(v); setDialog(null); };

  useEffect(() => {
    if (!dialog) return;
    okBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { dialog.resolve(false); setDialog(null); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog]);

  return (
    <ToastCtx.Provider value={toast}>
      <ConfirmCtx.Provider value={confirm}>
        {children}

        <div className="no-print pointer-events-none fixed bottom-4 right-4 z-[80] flex w-[min(92vw,380px)] flex-col gap-2" role="status" aria-live="polite">
          {toasts.map((t) => {
            const Icon = ICON[t.kind];
            return (
              <div key={t.id} className="card rise pointer-events-auto flex items-start gap-3 px-4 py-3 text-sm">
                <Icon size={18} className={`mt-0.5 shrink-0 ${TONE[t.kind]}`} aria-hidden="true" />
                <p className="flex-1 text-gray-800">{t.text}</p>
                <button type="button" aria-label="Fechar" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="text-gray-500 hover:text-gray-800"><X size={14} /></button>
              </div>
            );
          })}
        </div>

        {dialog && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && close(false)}>
            <div role="alertdialog" aria-modal="true" aria-labelledby="cf-title" className="card rise w-full max-w-md p-5">
              <h2 id="cf-title" className="font-display text-lg font-semibold text-gray-900">{dialog.title}</h2>
              {dialog.message && <p className="mt-2 whitespace-pre-line text-sm text-gray-600">{dialog.message}</p>}
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" className="btn-secondary" onClick={() => close(false)}>Cancelar</button>
                <button ref={okBtn} type="button" className={dialog.danger ? "btn-danger" : "btn-primary"} onClick={() => close(true)}>{dialog.confirmLabel ?? "Confirmar"}</button>
              </div>
            </div>
          </div>
        )}
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  );
}
