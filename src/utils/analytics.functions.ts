import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  recordHeartbeat,
  cleanupStaleSessions,
  getDashboardMetrics,
} from "./analytics.server";
import { isAdminCookieValid, ADMIN_COOKIE_NAME } from "./tiktok.server";

const heartbeatSchema = z.object({
  sessionId: z.string().min(8).max(80).regex(/^[a-zA-Z0-9_-]+$/),
  page: z.string().min(1).max(500),
  source: z.string().max(40).optional(),
  referrer: z.string().max(300).optional(),
  landing: z.string().max(500).optional(),
  utmCampaign: z.string().max(200).optional(),
});

type Geo = { city: string | null; region: string | null; country: string | null };

/** Best-effort cache to avoid a geo lookup on every heartbeat. */
const geoCache = new Map<string, Geo>();

/** Fallback quando os headers geo do Cloudflare não vêm preenchidos. */
async function lookupGeoByIp(ip: string): Promise<Geo | null> {
  const cached = geoCache.get(ip);
  if (cached) return cached;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?lang=pt-BR`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      success?: boolean;
      city?: string;
      region?: string;
      country_code?: string;
    };
    if (json.success === false) return null;
    const geo: Geo = {
      city: json.city ?? null,
      region: json.region ?? null,
      country: json.country_code ?? null,
    };
    geoCache.set(ip, geo);
    // Mantém o cache enxuto.
    if (geoCache.size > 2000) {
      const first = geoCache.keys().next().value;
      if (first) geoCache.delete(first);
    }
    return geo;
  } catch {
    return null;
  }
}

/** Public: called by every visitor every ~15s. */
export const sendHeartbeat = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => heartbeatSchema.parse(raw))
  .handler(async ({ data }) => {
    let userAgent: string | null = null;
    let ip: string | null = null;
    let city: string | null = null;
    let region: string | null = null;
    let country: string | null = null;
    try {
      userAgent = getRequestHeader("user-agent") ?? null;
      ip =
        getRequestHeader("cf-connecting-ip") ??
        getRequestHeader("x-real-ip") ??
        (getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ?? null);
      // Cloudflare geo headers (available on Workers + lovable.app deploys).
      const decode = (v: string | undefined | null) => {
        if (!v) return null;
        try { return decodeURIComponent(v); } catch { return v; }
      };
      city = decode(getRequestHeader("cf-ipcity")) ?? null;
      region = decode(getRequestHeader("cf-region")) ?? null;
      country = decode(getRequestHeader("cf-ipcountry")) ?? null;
      // Sem cidade via headers? Consulta por IP (melhor esforço).
      if (!city && ip) {
        const geo = await lookupGeoByIp(ip);
        if (geo) {
          city = geo.city;
          region = region ?? geo.region;
          country = country ?? geo.country;
        }
      }
    } catch {}

    await recordHeartbeat({
      sessionId: data.sessionId,
      page: data.page,
      source: data.source ?? null,
      referrer: data.referrer ?? null,
      landing: data.landing ?? null,
      utmCampaign: data.utmCampaign ?? null,
      userAgent,
      ip,
      city,
      region,
      country,
    });

    // Run cleanup ~5% of the time so the table doesn't grow forever.
    if (Math.random() < 0.05) {
      try { await cleanupStaleSessions(); } catch {}
    }

    return { ok: true as const };
  });

const dashboardQuerySchema = z
  .object({
    period: z.enum(["today", "yesterday", "7d", "30d", "all"]).optional(),
  })
  .optional();

/** Admin-only: returns live counts + today/24h/7d ranges and period funnel. */
export const getDashboard = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => {
    if (!raw) return { period: "today" as const };
    const parsed = dashboardQuerySchema.parse(raw);
    return { period: parsed?.period ?? ("today" as const) };
  })
  .handler(async ({ data }) => {
    const token = (() => {
      try {
        return getCookie(ADMIN_COOKIE_NAME);
      } catch {
        return undefined;
      }
    })();
    if (!isAdminCookieValid(token)) {
      return { ok: false as const, error: "unauthorized" };
    }
    const metrics = await getDashboardMetrics(data.period);
    return { ok: true as const, metrics };
  });
