const COLORS = ["#b98d36", "#3b77ba", "#3e8662", "#bd3a55", "#825bc4", "#c2693a", "#2f8f9d"];

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export default function Avatar({ name, size = 32, online }: { name: string; size?: number; online?: boolean }) {
  const color = COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <span aria-hidden="true" className="flex h-full w-full items-center justify-center rounded-full font-semibold text-white" style={{ background: color, fontSize: size * 0.38 }}>{initials(name)}</span>
      {online !== undefined && (
        <span title={online ? "Online" : "Offline"} className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 ${online ? "dot-online" : "dot"}`} style={{ borderColor: "rgb(var(--surface))" }} />
      )}
    </span>
  );
}
