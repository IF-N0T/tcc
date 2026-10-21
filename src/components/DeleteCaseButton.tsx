"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export default function DeleteCaseButton({ caseId, caseCode }: { caseId: string; caseCode: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Antes da exclusão, será baixado um arquivo de backup do caso ${caseCode}. Confirme para continuar. A exclusão não pode ser desfeita.`)) return;

    setDeleting(true);
    try {
      const backupResponse = await fetch(`/api/cases/${caseId}/backup`);
      if (!backupResponse.ok) {
        const data = await backupResponse.json().catch(() => null);
        window.alert(data?.error ?? "Não foi possível criar o backup. O caso não foi excluído.");
        return;
      }
      const backup = await backupResponse.blob();
      if (backup.size === 0) {
        window.alert("O backup recebido está vazio. O caso não foi excluído.");
        return;
      }

      const contentDisposition = backupResponse.headers.get("Content-Disposition");
      const filename = contentDisposition?.match(/filename="([^"]+)"/i)?.[1] ?? `backup-${caseCode}.json`;
      const downloadUrl = URL.createObjectURL(backup);
      const downloadLink = document.createElement("a");
      downloadLink.href = downloadUrl;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);

      const response = await fetch(`/api/cases/${caseId}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        window.alert(data?.error ?? "O backup foi baixado, mas não foi possível excluir o caso.");
        return;
      }
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado.";
      window.alert(`Não foi possível concluir o backup ou a exclusão. Verifique se o caso continua cadastrado. ${message}`);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      aria-label={`Excluir caso ${caseCode}`}
      title={`Excluir caso ${caseCode}`}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-950/40 dark:hover:text-red-300"
    >
      <Trash2 size={16} aria-hidden="true" />
    </button>
  );
}
