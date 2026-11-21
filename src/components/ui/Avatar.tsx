type AvatarRole = "ADMIN" | "PERITO" | "VISUALIZADOR" | "VICTOR";

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function profileFor(name: string, role?: string): AvatarRole | null {
  const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/^victor(?:\s|$)/.test(normalized)) return "VICTOR";
  if (role === "ADMIN" || role === "PERITO" || role === "VISUALIZADOR") return role;
  if (/\b(admin|administrador|victor)\b/.test(normalized)) return "ADMIN";
  if (/\b(ana perita|perito)\b/.test(normalized)) return "PERITO";
  if (/\b(carlos visualizador|visualizador)\b/.test(normalized)) return "VISUALIZADOR";
  return null;
}

function Portrait({ role }: { role: AvatarRole }) {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
      <circle cx="32" cy="32" r="32" fill="rgb(var(--surface-muted))" />
      {role === "ADMIN" && (
        <>
          <path d="M7 64c2-13 11-20 25-20s23 7 25 20" fill="rgb(var(--brand-700))" />
          <path d="M27 39h10v12H27z" fill="rgb(177 126 100)" />
          <path d="M19 25c0-13 6-20 13-20s14 7 14 20v8c-2 10-7 15-14 15s-12-5-13-15z" fill="rgb(196 148 119)" />
          <path d="M18 25C16 9 23 3 33 3c11 0 16 8 14 22l-5-8-7-5-10 5-5 9z" fill="rgb(var(--text-muted))" />
          <path d="M18 25c-2 8-1 14 2 18l3-1-2-12zm29 0c2 8 1 14-2 18l-3-1 2-12z" fill="rgb(var(--text-muted))" />
          <path d="M24 28h6m5 0h6" stroke="rgb(var(--ink-800))" strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="27" cy="30" r="1" fill="rgb(var(--ink-800))" />
          <circle cx="38" cy="30" r="1" fill="rgb(var(--ink-800))" />
          <path d="M32 30l-2 7h4m-7 7c3 2 7 2 10 0" fill="none" stroke="rgb(116 78 63)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M23 39c2 6 5 9 9 9s7-3 9-9l-3 1-2 4h-8l-2-4z" fill="rgb(var(--text-muted))" />
          <path d="M27 52l5 5 5-5-2-3h-6z" fill="rgb(var(--surface))" />
        </>
      )}
      {role === "PERITO" && (
        <>
          <path d="M7 64c2-13 11-20 25-20s23 7 25 20" fill="rgb(var(--brand-600))" />
          <path d="M27 39h10v12H27z" fill="rgb(177 126 100)" />
          <path d="M16 28c0-15 7-23 16-23 10 0 17 8 17 23v12c-4 9-10 13-17 13s-13-4-16-13z" fill="rgb(196 148 119)" />
          <path d="M15 31C12 13 20 3 32 3c12 0 20 10 17 28l-4-4-2-12-11 5-12-2-2 13z" fill="rgb(var(--ink-700))" />
          <path d="M17 37c-1 7 2 14 6 18l-4 9H8c1-10 3-18 9-27zm30 0c1 7-2 14-6 18l4 9h11c-1-10-3-18-9-27z" fill="rgb(var(--ink-700))" />
          <path d="M23 29h7m5 0h7" stroke="rgb(var(--ink-800))" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="27" cy="31" r="1" fill="rgb(var(--ink-800))" />
          <circle cx="38" cy="31" r="1" fill="rgb(var(--ink-800))" />
          <path d="M32 31l-2 7h4m-7 5c3 2 7 2 10 0" fill="none" stroke="rgb(116 78 63)" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M20 27c4-5 8-7 12-7s8 2 12 7" fill="none" stroke="rgb(var(--ink-700))" strokeWidth="3" />
        </>
      )}
      {role === "VISUALIZADOR" && (
        <>
          <path d="M6 64c3-13 12-20 26-20s23 7 26 20" fill="rgb(var(--info))" />
          <path d="M27 39h10v12H27z" fill="rgb(177 126 100)" />
          <path d="M18 24c0-12 6-18 14-18s14 6 14 18v12c-3 9-8 13-14 13s-11-4-14-13z" fill="rgb(196 148 119)" />
          <path d="M17 27C15 12 21 4 32 4s17 8 15 23l-5-9-7-3-8 3-5 9z" fill="rgb(var(--ink-800))" />
          <path d="M24 29h6m5 0h6" stroke="rgb(var(--ink-800))" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="27" cy="31" r="1" fill="rgb(var(--ink-800))" />
          <circle cx="38" cy="31" r="1" fill="rgb(var(--ink-800))" />
          <path d="M32 31l-2 7h4m-6 4c2 2 6 2 8 0" fill="none" stroke="rgb(116 78 63)" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M32 48v13m-5-8 5 4 5-4" fill="none" stroke="rgb(var(--surface))" strokeWidth="2" />
          <circle cx="49" cy="47" r="8" fill="rgb(var(--brand-500))" stroke="rgb(var(--surface))" strokeWidth="2" />
          <rect x="46.5" y="42" width="5" height="9" rx="2.5" fill="rgb(var(--surface))" />
          <path d="M45 47v1a4 4 0 0 0 8 0v-1m-4 5v2m-2 0h4" fill="none" stroke="rgb(var(--surface))" strokeWidth="1.3" strokeLinecap="round" />
        </>
      )}
      {role === "VICTOR" && (
        <>
          <path d="M5 64c2-13 12-21 27-21s25 8 27 21" fill="rgb(47 118 75)" />
          <path d="M27 39h10v12H27z" fill="rgb(177 126 100)" />
          <path d="M17 25c0-13 6-20 15-20s15 7 15 20v11c-3 10-9 15-15 15s-12-5-15-15z" fill="rgb(196 148 119)" />
          <path d="M16 27C14 11 22 3 32 3s18 8 16 24l-5-8-8-4-10 4-5 9z" fill="rgb(var(--ink-800))" />
          <path d="M18 25h12v10H19l-2-2zm17 0h12l-1 8-2 2H35z" fill="rgb(var(--ink-900))" stroke="rgb(var(--ink-700))" strokeWidth="1.5" />
          <path d="M30 28h5" stroke="rgb(var(--ink-800))" strokeWidth="2" />
          <path d="M32 34l-2 5h4m-6 5c2 2 6 2 8 0" fill="none" stroke="rgb(116 78 63)" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export default function Avatar({ name, role, size = 32, online }: { name: string; role?: string; size?: number; online?: boolean }) {
  const profile = profileFor(name, role);
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {profile
        ? <span className="block h-full w-full overflow-hidden rounded-full ring-1 ring-[rgb(var(--border))]"><Portrait role={profile} /></span>
        : <span aria-hidden="true" className="flex h-full w-full items-center justify-center rounded-full bg-brand-700 font-semibold text-white" style={{ fontSize: size * 0.38 }}>{initials(name)}</span>}
      {online !== undefined && (
        <span title={online ? "Online" : "Offline"} className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 ${online ? "dot-online" : "dot"}`} style={{ borderColor: "rgb(var(--surface))" }} />
      )}
    </span>
  );
}
