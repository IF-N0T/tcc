"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, Eye, EyeOff, Fingerprint, Lock, ShieldCheck, Workflow } from "lucide-react";
import ThemeMenu from "@/components/ui/ThemeMenu";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { try { const e = localStorage.getItem("sherlock-email"); if (e) setEmail(e); } catch {} }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Falha ao entrar"); return; }
      try { if (remember) localStorage.setItem("sherlock-email", email); else localStorage.removeItem("sherlock-email"); } catch {}
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Não foi possível conectar ao servidor. Se o site estava inativo, aguarde cerca de 1 minuto e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-gray-50 lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-ink-900 p-12 text-gray-200 lg:flex">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 36px), repeating-linear-gradient(90deg, #fff 0 1px, transparent 1px 36px)" }} />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <img src="/sherlock-logo.png" alt="" className="h-10 w-10 object-contain" />
          <span className="font-display text-xl font-semibold text-white">Sherlock</span>
        </div>
        <div className="relative max-w-md">
          <div className="eyebrow">Plataforma de perícia forense digital</div>
          <h2 className="font-display mt-3 text-4xl font-semibold leading-tight text-white">Cada vestígio, com origem e destino registrados.</h2>
          <ul className="mt-8 space-y-4 text-sm text-gray-400">
            <li className="flex gap-3"><Fingerprint className="mt-0.5 shrink-0 text-brand-400" size={18} /> Hashes, cadeia de custódia e linha do tempo em um só lugar.</li>
            <li className="flex gap-3"><Workflow className="mt-0.5 shrink-0 text-brand-400" size={18} /> Importe resultados do Autopsy e do ImageJ e exporte para Excel, HTML e Bloco de Notas.</li>
            <li className="flex gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-brand-400" size={18} /> O Assistente Watson aponta lacunas sem inventar dados.</li>
          </ul>
        </div>
        <p className="relative text-xs text-gray-500">Uso restrito a peritos autorizados.</p>
      </aside>

      <main className="relative flex items-center justify-center p-6">
        <div className="absolute right-4 top-4"><ThemeMenu /></div>
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:text-left">
            <img src="/sherlock-holmes.png" alt="" className="mx-auto mb-4 h-14 w-14 rounded-xl object-contain lg:mx-0 lg:hidden" />
            <h1 className="font-display text-3xl font-semibold text-gray-900">Entrar</h1>
            <p className="mt-1 text-sm text-gray-500">Acesse com a sua conta institucional.</p>
          </div>

          <form onSubmit={handleSubmit} className="card space-y-4 p-6" noValidate>
            <div>
              <label className="label" htmlFor="email">E-mail</label>
              <input id="email" className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
            <div>
              <label className="label" htmlFor="password">Senha</label>
              <div className="relative">
                <input id="password" className="input pr-10" type={show ? "text" : "password"} autoComplete="current-password" value={password}
                  onChange={(e) => setPassword(e.target.value)} onKeyUp={(e) => setCaps(e.getModifierState("CapsLock"))} required />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Ocultar senha" : "Mostrar senha"} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:text-gray-800">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {caps && <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-500"><Lock size={12} /> Caps Lock está ativado.</p>}
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--brand-500))]" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Lembrar meu e-mail neste navegador
            </label>
            {error && <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-500"><CircleAlert size={16} className="mt-0.5 shrink-0" />{error}</p>}
            <button className="btn-primary w-full !py-2.5" disabled={loading} type="submit">{loading ? "Entrando…" : "Entrar"}</button>
          </form>

          <details className="mt-4 text-xs text-gray-500">
            <summary className="cursor-pointer select-none hover:text-gray-800">Ambiente de demonstração</summary>
            <p className="mt-2 leading-relaxed">Contas de teste: admin@sherlock.local, perito@sherlock.local e visualizador@sherlock.local (senha Sherlock@123). Troque as senhas antes de usar dados reais.</p>
          </details>
        </div>
      </main>
    </div>
  );
}
