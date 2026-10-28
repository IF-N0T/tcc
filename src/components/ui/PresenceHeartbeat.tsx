"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { HEARTBEAT_INTERVAL_MS } from "@/lib/presence";

/** Envia um sinal de vida enquanto a aba está visível e avisa quando o usuário sai. */
export default function PresenceHeartbeat() {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    let stopped = false;

    async function beat() {
      if (stopped || document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/presence", { method: "POST", cache: "no-store" });
        if (res.status === 401 || res.status === 403) { stopped = true; clearInterval(timer); router.push("/login"); router.refresh(); }
      } catch {}
    }
    const onVisible = () => { if (document.visibilityState === "visible") beat(); };
    const onLeave = () => { try { navigator.sendBeacon("/api/presence?leave=1"); } catch {} };

    beat();
    timer = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pagehide", onLeave);
    return () => { stopped = true; clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("pagehide", onLeave); };
  }, [router]);

  return null;
}
