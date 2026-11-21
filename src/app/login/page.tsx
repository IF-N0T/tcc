"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Check, CircleAlert, Eye, EyeOff, Fingerprint, KeyRound, LoaderCircle, LockKeyhole,
  Mail, ShieldCheck, Sparkles, Workflow
} from "lucide-react";
import ThemeMenu from "@/components/ui/ThemeMenu";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [slowConnection, setSlowConnection] = useState(false);

  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem("sherlock-email");
      if (savedEmail) {
        setEmail(savedEmail);
        setRemember(true);
      }
    } catch {
      // O armazenamento local pode estar indisponível em alguns navegadores.
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setSlowConnection(false);
    const slowTimer = window.setTimeout(() => setSlowConnection(true), 4000);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Não foi possível entrar. Confira seus dados e tente novamente.");
        return;
      }
      try {
        if (remember) localStorage.setItem("sherlock-email", email);
        else localStorage.removeItem("sherlock-email");
      } catch {
        // A autenticação não depende de armazenamento local.
      }
      router.push(data.mustChangePassword ? "/change-password" : "/dashboard");
      router.refresh();
    } catch {
      setError("Não foi possível conectar ao servidor. Se o site estava inativo, aguarde cerca de 1 minuto e tente novamente.");
    } finally {
      window.clearTimeout(slowTimer);
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <aside className="login-panel group">
        <div aria-hidden="true" className="login-grid" />
        <div aria-hidden="true" className="login-orb login-orb-one" />
        <div aria-hidden="true" className="login-orb login-orb-two" />

        <div className="login-brand login-reveal">
          <span className="login-brand-mark"><img src="/sherlock-logo.png" alt="" /></span>
          <span className="font-display text-xl font-semibold">Sherlock</span>
          <span className="login-brand-tag">FORENSE DIGITAL</span>
        </div>

        <div className="login-story">
          <div className="login-kicker login-reveal login-delay-1"><Sparkles size={14} aria-hidden="true" /> Plataforma de perícia forense digital</div>
          <h2 className="font-display login-headline login-reveal login-delay-1">
            Evidências organizadas.<br />
            <span>Conclusões rastreáveis.</span>
          </h2>
          <p className="login-description login-reveal login-delay-2">
            Um espaço de trabalho para acompanhar cada vestígio, preservar seu contexto e documentar o caminho da análise.
          </p>

          <div className="login-workflow login-reveal login-delay-2" aria-label="Fluxo de trabalho">
            <div className="login-workflow-line" aria-hidden="true" />
            <div className="login-workflow-step"><span><Fingerprint size={17} aria-hidden="true" /></span><small>Vestígio</small></div>
            <div className="login-workflow-step"><span><Workflow size={17} aria-hidden="true" /></span><small>Rastreio</small></div>
            <div className="login-workflow-step"><span><ShieldCheck size={17} aria-hidden="true" /></span><small>Relatório</small></div>
          </div>

          <div className="login-feature-list login-reveal login-delay-3">
            <div><Check size={15} aria-hidden="true" /><span>Hashes e cadeia de custódia no mesmo fluxo</span></div>
            <div><Check size={15} aria-hidden="true" /><span>Watson aponta lacunas com base nos registros</span></div>
          </div>
        </div>

        <div className="login-panel-footer login-reveal login-delay-3">
          <span><LockKeyhole size={13} aria-hidden="true" /> Ambiente de acesso restrito</span>
          <span>Uso por profissionais autorizados</span>
        </div>
      </aside>

      <main className="login-main">
        <div className="login-theme-menu"><ThemeMenu /></div>
        <section className="login-card login-reveal" aria-labelledby="login-title">
          <div className="login-mobile-brand">
            <span className="login-brand-mark"><img src="/sherlock-logo.png" alt="" /></span>
            <span className="font-display text-lg font-semibold">Sherlock</span>
          </div>

          <div className="login-form-heading">
            <span className="login-form-icon"><KeyRound size={19} aria-hidden="true" /></span>
            <p className="eyebrow">Acesso seguro</p>
            <h1 id="login-title" className="font-display">Bem-vindo de volta</h1>
            <p>Entre com as credenciais da sua conta institucional.</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form" noValidate aria-busy={loading}>
            <div className="login-field">
              <label className="label" htmlFor="email">E-mail</label>
              <div className="login-input-wrap">
                <Mail className="login-input-icon" size={17} aria-hidden="true" />
                <input
                  id="email"
                  className="input login-input"
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "login-error" : undefined}
                />
              </div>
            </div>

            <div className="login-field">
              <div className="login-label-row">
                <label className="label" htmlFor="password">Senha</label>
                <span className="login-label-hint"><LockKeyhole size={12} aria-hidden="true" /> Protegida</span>
              </div>
              <div className="login-input-wrap">
                <LockKeyhole className="login-input-icon" size={17} aria-hidden="true" />
                <input
                  id="password"
                  className="input login-input login-password-input"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={(e) => setCaps(e.getModifierState("CapsLock"))}
                  onBlur={() => setCaps(false)}
                  required
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "login-error" : caps ? "caps-warning" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShow((visible) => !visible)}
                  aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={show}
                  className="login-password-toggle"
                >
                  {show ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                </button>
              </div>
              {caps && <p id="caps-warning" role="status" aria-live="polite" className="login-caps-warning"><CircleAlert size={14} aria-hidden="true" /> Caps Lock está ativado.</p>}
            </div>

            <label className="login-remember">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[rgb(var(--brand-500))]"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>Lembrar meu e-mail neste navegador</span>
            </label>

            {error && (
              <p id="login-error" role="alert" aria-live="polite" className="notice notice-crit login-error">
                <CircleAlert size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </p>
            )}

            <button className="btn-primary login-submit" disabled={loading} type="submit">
              {loading ? <LoaderCircle className="login-spinner" size={18} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
              <span aria-live="polite">{loading ? (slowConnection ? "Acordando o servidor…" : "Validando acesso…") : "Entrar na plataforma"}</span>
            </button>
            {slowConnection && loading && <p className="login-wait-hint" role="status">A primeira resposta pode levar até um minuto.</p>}
          </form>

          {process.env.NEXT_PUBLIC_DEMO === "true" && (
            <aside className="notice notice-info login-demo" aria-label="Ambiente de demonstração">
              <p className="font-semibold">Ambiente de demonstração</p>
              <p className="mt-1">Visualizador: <span className="font-medium">visualizador@sherlock.local</span></p>
              <p className="mt-1 text-xs">A senha é fornecida pelo responsável pelo ambiente. Contas com acesso de edição não são exibidas aqui.</p>
            </aside>
          )}

          <p className="login-restriction"><ShieldCheck size={14} aria-hidden="true" /> Acesso restrito a profissionais autorizados</p>
          <p className="login-version">Sherlock <span aria-hidden="true">·</span> Plataforma de perícia digital</p>
        </section>
      </main>
    </div>
  );
}
