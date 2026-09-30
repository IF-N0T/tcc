"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export default function DeleteCaseButton({ caseId, caseCode }: { caseId: string; caseCode: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Excluir permanentemente o caso ${caseCode}? Esta ação não pode ser desfeita.`)) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/cases/${caseId}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        window.alert(data?.error ?? "Não foi possível excluir o caso.");
        return;
      }
      router.refresh();
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
