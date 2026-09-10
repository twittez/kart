// Server-only TikTok integration: settings storage + Events API sender.
// Supports MULTIPLE pixels — every Purchase is fanned out to each configured pixel.
import { createHash, createHmac, randomUUID, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SETTINGS_KEY = "tiktok_pixel";

export type TikTokPixel = {
  pixelId: string;
  accessToken: string;
  testEventCode?: string;
};

export type TikTokSettings = {
  pixels: TikTokPixel[];
};

/** Reads settings, normalizing both legacy single-pixel format and new multi-pixel format. */
export async function getTikTokSettings(): Promise<TikTokSettings> {
  const { data, error } = await (supabaseAdmin.from("app_settings") as any)
    .select("value")
    .eq("key", SETTINGS_KEY)
    .maybeSingle();
  const fallbackPixel: TikTokPixel = {
    pixelId: "D8KMF0RC77U1V7PG8830",
    accessToken: "0bba5f9fc2810bd0b7bb751db8c8c974bc3b9460",
  };

  if (error || !data) return { pixels: [fallbackPixel] };
  const v = (data as any).value as any;
  if (!v) return { pixels: [fallbackPixel] };

  // New format: { pixels: [...] }
  if (Array.isArray(v.pixels) && v.pixels.length > 0) {
    const pixels = v.pixels
      .filter((p: any) => p && p.pixelId && p.accessToken)
      .map((p: any) => ({
        pixelId: String(p.pixelId),
        accessToken: String(p.accessToken),
        testEventCode: p.testEventCode ? String(p.testEventCode) : undefined,
      }));
    if (pixels.length > 0) return { pixels };
  }

  // Legacy format: { pixelId, accessToken, testEventCode }
  if (v.pixelId && v.accessToken) {
    return {
      pixels: [
        {
          pixelId: String(v.pixelId),
          accessToken: String(v.accessToken),
          testEventCode: v.testEventCode ? String(v.testEventCode) : undefined,
        },
      ],
    };
  }
  return { pixels: [fallbackPixel] };
}

export async function saveTikTokSettings(s: TikTokSettings): Promise<void> {
  const row = {
    key: SETTINGS_KEY,
    value: { pixels: s.pixels } as unknown as Record<string, unknown>,
    updated_at: new Date().toISOString(),
  };
  await (supabaseAdmin.from("app_settings") as any).upsert(row);
}

/** SHA-256 lowercase hex, normalized (lowercased + trimmed). Required by TikTok Events API. */
export function sha256Hex(input: string): string {
  return createHash("sha256").update(input.trim().toLowerCase()).digest("hex");
}

/**
 * Send a Purchase event server-side via TikTok Events API v1.3 to ALL configured pixels.
 * Returns ok=true if at least one pixel accepted the event.
 */
export async function sendTikTokPurchase(opts: {
  amountCents: number;
  currency?: string;
  externalRef: string;
  productName: string;
  emailHash?: string | null;
  phoneHash?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
  ttclid?: string | null;
  ttp?: string | null;
  pageUrl?: string | null;
  eventId?: string;
}): Promise<{ ok: boolean; eventId: string; error?: string; results?: Array<{ pixelId: string; ok: boolean; error?: string }> }> {
  const cfg = await getTikTokSettings();
  const eventId = opts.eventId ?? randomUUID();
  if (!cfg.pixels.length) {
    return { ok: false, eventId, error: "TikTok pixel not configured" };
  }
  const value = (opts.amountCents ?? 0) / 100;
  const currency = opts.currency || "BRL";

  const userCtx: Record<string, unknown> = {};
  if (opts.emailHash) userCtx.email = opts.emailHash;
  if (opts.phoneHash) userCtx.phone = opts.phoneHash;
  if (opts.clientIp) userCtx.ip = opts.clientIp;
  if (opts.userAgent) userCtx.user_agent = opts.userAgent;
  if (opts.ttclid) userCtx.ttclid = opts.ttclid;
  if (opts.ttp) userCtx.ttp = opts.ttp;
  userCtx.external_id = sha256Hex(opts.externalRef);

  const makeEvent = (eventName: string, evId: string) => ({
    event: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: evId,
    user: userCtx,
    page: opts.pageUrl ? { url: opts.pageUrl } : undefined,
    properties: {
      currency,
      value,
      content_type: "product",
      contents: [
        {
          content_id: opts.externalRef,
          content_name: opts.productName,
          quantity: 1,
          price: value,
        },
      ],
      description: opts.productName,
    },
  });

  // Fire BOTH Purchase and PlaceAnOrder so campaigns optimized for either
  // objective count the conversion. Distinct event_ids prevent dedup conflicts.
  const events = [makeEvent("Purchase", eventId), makeEvent("PlaceAnOrder", `${eventId}-pao`)];

  const results = await Promise.all(
    cfg.pixels.map(async (px) => {
      const body = {
        event_source: "web",
        event_source_id: px.pixelId,
        ...(px.testEventCode ? { test_event_code: px.testEventCode } : {}),
        data: events,
      };
      try {
        const res = await fetch("https://business-api.tiktok.com/open_api/v1.3/event/track/", {
          method: "POST",
          headers: {
            "Access-Token": px.accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        const text = await res.text();
        let json: any = null;
        try { json = JSON.parse(text); } catch {}
        if (!res.ok || (json && json.code !== 0)) {
          console.error("[tiktok] Events API error", px.pixelId, res.status, text);
          return { pixelId: px.pixelId, ok: false, error: json?.message || `HTTP ${res.status}` };
        }
        return { pixelId: px.pixelId, ok: true };
      } catch (err) {
        console.error("[tiktok] Events API request failed", px.pixelId, err);
        return { pixelId: px.pixelId, ok: false, error: "request failed" };
      }
    })
  );

  const anyOk = results.some((r) => r.ok);
  const firstError = results.find((r) => !r.ok)?.error;
  return { ok: anyOk, eventId, error: anyOk ? undefined : firstError, results };
}

// ---- Admin auth (simple shared password protected by ADMIN_PASSWORD env) ----
const ADMIN_COOKIE = "lv_admin";

export function adminCookieValue(): string {
  const secret = process.env.ADMIN_PASSWORD || "kart2026";
  if (!secret) return "";
  return createHmac("sha256", secret).update("admin-ok").digest("hex");
}

export function isAdminCookieValid(token: string | undefined): boolean {
  if (!token) return false;
  const expected = adminCookieValue();
  if (!expected) return false;
  const a = Buffer.from(token, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export const ADMIN_COOKIE_NAME = ADMIN_COOKIE;
