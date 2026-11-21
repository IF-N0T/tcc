"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, LockKeyhole, ShieldCheck } from "lucide-react";
import ThemeMenu from "@/components/ui/ThemeMenu";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error ?? "Não foi possível trocar a senha.");
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="absolute right-4 top-4"><ThemeMenu /></div>
      <section className="card w-full max-w-md space-y-6 p-7 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-brand-500/10 p-3 text-brand-600"><ShieldCheck size={22} /></div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-gray-900">Troque sua senha</h1>
            <p className="mt-1 text-sm text-gray-500">
              Por segurança, defina uma senha pessoal para continuar.
            </p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="current-password" className="label">Senha atual</label>
            <input id="current-password" className="input" type="password" autoComplete="current-password"
              value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required autoFocus />
          </div>
          <div>
            <label htmlFor="new-password" className="label">Nova senha</label>
            <input id="new-password" className="input" type="password" autoComplete="new-password"
              minLength={12} maxLength={128} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
            <p className="mt-1 text-xs text-gray-500">Use pelo menos 12 caracteres.</p>
          </div>
          {error && <p role="alert" aria-live="polite" className="notice notice-crit flex items-start gap-2"><CircleAlert size={16} className="mt-0.5 shrink-0" />{error}</p>}
          <button type="submit" className="btn-primary w-full !py-2.5" disabled={loading}>
            <span className="inline-flex items-center justify-center gap-2"><LockKeyhole size={16} />{loading ? "Salvando…" : "Salvar nova senha"}</span>
          </button>
        </form>
      </section>
    </main>
  );
}
