import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { sendHeartbeat } from "@/utils/analytics.functions";
import { captureAttribution, getAttribution } from "@/lib/attribution";

const STORAGE_KEY = "lv_sid";
const HEARTBEAT_MS = 15_000;

function classifySource(): string {
  const a = getAttribution();
  const src = (a.utmSource || "").toLowerCase();
  if (a.ttclid || src.includes("tiktok")) return "tiktok";
  if (a.gclid || src.includes("google")) return "google";
  if (src) return src.slice(0, 40);
  const ref = (a.referrer || "").toLowerCase();
  if (ref.includes("tiktok")) return "tiktok";
  if (ref.includes("google")) return "google";
  if (ref.includes("instagram") || ref.includes("facebook")) return "social";
  if (ref) return "referencia";
  return "direto";
}

function getOrCreateSessionId(): string {
  try {
    const existing = sessionStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const id =
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36)
      ).replace(/[^a-zA-Z0-9_-]/g, "");
    sessionStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return "anon-" + Math.random().toString(36).slice(2);
  }
}

/**
 * Sends a heartbeat to the server every 15s while the tab is open and visible.
 * The server treats sessions inactive after 30s, so missing one ping drops the user
 * from the live counter.
 */
export function PresenceTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    captureAttribution();
  }, []);

  useEffect(() => {
    // Don't track admin or verification pages (avoid duplicate sessions).
    if (pathname.startsWith("/admin")) return;

    const sessionId = getOrCreateSessionId();
    let cancelled = false;

    const ping = async () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      try {
        const attr = getAttribution();
        await sendHeartbeat({
          data: {
            sessionId,
            page: pathname || "/",
            source: classifySource(),
            referrer: attr.referrer?.slice(0, 300),
            landing: typeof window !== "undefined" ? window.location.pathname.slice(0, 500) : undefined,
            utmCampaign: attr.utmCampaign?.slice(0, 200),
          },
        });
      } catch {
        // Network blip — try again next tick.
      }
    };

    // Immediate ping on mount / route change, then every 15s.
    void ping();
    const interval = window.setInterval(ping, HEARTBEAT_MS);

    // Re-ping when tab becomes visible again.
    const onVisible = () => { if (document.visibilityState === "visible") void ping(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pathname]);

  return null;
}
