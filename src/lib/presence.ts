// Presença de contas: "online" = sinal de vida recente e sem saída explícita.

export const HEARTBEAT_INTERVAL_MS = 45_000;
export const ONLINE_WINDOW_MS = 150_000;

type PresenceFields = {
  lastSeenAt?: Date | string | null;
  leftAt?: Date | string | null;
};

export function isOnline(user: PresenceFields, now: number = Date.now()): boolean {
  if (!user.lastSeenAt) return false;
  const seen = new Date(user.lastSeenAt).getTime();
  if (Number.isNaN(seen) || now - seen > ONLINE_WINDOW_MS) return false;
  if (user.leftAt) {
    const left = new Date(user.leftAt).getTime();
    if (!Number.isNaN(left) && left >= seen) return false;
  }
  return true;
}
