"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useConfirm, useToast } from "@/components/ui/Providers";

export default function DeleteCaseButton({ caseId, caseCode, redirectTo }: { caseId: string; caseCode: string; redirectTo?: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    const ok = await confirm({
      title: `Excluir o caso ${caseCode}?`,
      message: "Antes da exclusão será baixado um arquivo de backup do caso. A exclusão não pode ser desfeita.",
      confirmLabel: "Baixar backup e excluir", danger: true
    });
    if (!ok) return;

    setDeleting(true);
    try {
      const backupResponse = await fetch(`/api/cases/${caseId}/backup`);
      if (!backupResponse.ok) {
        const data = await backupResponse.json().catch(() => null);
        toast(data?.error ?? "Não foi possível criar o backup. O caso não foi excluído.", "error");
        return;
      }
      const backup = await backupResponse.blob();
      if (backup.size === 0) { toast("O backup recebido está vazio. O caso não foi excluído.", "error"); return; }

      const disposition = backupResponse.headers.get("Content-Disposition");
      const filename = disposition?.match(/filename="([^"]+)"/i)?.[1] ?? `backup-${caseCode}.json`;
      const url = URL.createObjectURL(backup);
      const a = document.createElement("a");
      a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);

      const response = await fetch(`/api/cases/${caseId}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast(data?.error ?? "O backup foi baixado, mas não foi possível excluir o caso.", "error");
        return;
      }
      toast(`Caso ${caseCode} excluído. O backup foi baixado.`, "ok");
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (error) {
      toast(`Não foi possível concluir o backup ou a exclusão. ${error instanceof Error ? error.message : ""}`, "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button type="button" onClick={handleDelete} disabled={deleting} aria-label={`Excluir caso ${caseCode}`} title={`Excluir caso ${caseCode}`}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50">
      <Trash2 size={16} aria-hidden="true" />
    </button>
  );
}
