"use client";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/Providers";

export default function CopyButton({ text, label = "Copiar", className = "" }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  const toast = useToast();
  return (
    <button type="button" className={`btn-ghost btn-sm ${className}`} aria-label={label} title={label}
      onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); toast("Copiado para a área de transferência.", "ok"); setTimeout(() => setDone(false), 1500); } catch { toast("Não foi possível copiar.", "error"); } }}>
      {done ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}<span className="sr-only sm:not-sr-only">{done ? "Copiado" : label}</span>
    </button>
  );
}
