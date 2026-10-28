"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, FileSpreadsheet, FileText, Package, Printer, Globe } from "lucide-react";

export const EXPORT_OPTIONS = (id: string) => [
  { group: "Ver no navegador", items: [
    { label: "Relatório colorido", hint: "HTML, com filtro e índice", href: `/api/cases/${id}/export?format=html&mode=color&inline=1`, icon: Globe, newTab: true },
    { label: "Relatório preto e branco", hint: "HTML econômico para impressão", href: `/api/cases/${id}/export?format=html&mode=bw&inline=1`, icon: Globe, newTab: true },
    { label: "Versão de impressão (P&B)", hint: "Abre o diálogo de impressão", href: `/api/cases/${id}/export?format=html&mode=bw&inline=1&print=1`, icon: Printer, newTab: true },
    { label: "Minuta de laudo", hint: "Com campos [PREENCHER]", href: `/api/cases/${id}/export?format=html&mode=bw&doc=laudo&inline=1`, icon: FileText, newTab: true }
  ] },
  { group: "Baixar arquivo", items: [
    { label: "Excel (.xlsx)", hint: "Uma aba por assunto", href: `/api/cases/${id}/export?format=xlsx`, icon: FileSpreadsheet },
    { label: "Bloco de notas (.txt)", hint: "Texto puro, 80 colunas", href: `/api/cases/${id}/export?format=txt`, icon: FileText },
    { label: "Pacote completo (.zip)", hint: "Tudo + interop + manifesto", href: `/api/cases/${id}/export?format=zip`, icon: Package },
    { label: "Dados (.json)", hint: "Para reimportar ou integrar", href: `/api/cases/${id}/export?format=json`, icon: Download }
  ] }
];

export default function ExportMenu({ caseId }: { caseId: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const on = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", on); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", on); document.removeEventListener("keydown", key); };
  }, [open]);

  return (
    <div className="relative" ref={box}>
      <button type="button" className="btn-secondary" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Download size={15} aria-hidden="true" /> Exportar <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="card rise absolute right-0 z-40 mt-2 w-[min(92vw,330px)] p-2">
          {EXPORT_OPTIONS(caseId).map((g) => (
            <div key={g.group} className="mb-1">
              <div className="eyebrow px-3 pb-1 pt-2 !text-gray-500">{g.group}</div>
              {g.items.map(({ label, hint, href, icon: Icon, ...rest }) => (
                <a key={label} role="menuitem" href={href} {...("newTab" in rest && rest.newTab ? { target: "_blank", rel: "noopener" } : {})} onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-800 hover:bg-gray-100">
                  <Icon size={16} className="shrink-0 text-brand-500" aria-hidden="true" />
                  <span><span className="block font-medium">{label}</span><span className="block text-xs text-gray-500">{hint}</span></span>
                </a>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
