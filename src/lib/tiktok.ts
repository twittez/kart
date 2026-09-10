export const TIKTOK_PIXEL_ID = "D8KMF0RC77U1V7PG8830";
export const TIKTOK_ACCESS_TOKEN = "0bba5f9fc2810bd0b7bb751db8c8c974bc3b9460";

declare global {
  interface Window {
    TiktokAnalyticsObject?: string;
    ttq?: {
      page: () => void;
      track: (event: string, properties?: Record<string, unknown>, options?: { event_id?: string }) => void;
      identify: (traits: Record<string, unknown>) => void;
      load: (pixelId: string) => void;
      [key: string]: unknown;
    };
  }
}

/** Hashes a string using standard SHA-256 for TikTok Advanced Matching */
export async function sha256(str: string): Promise<string> {
  const normalized = str.trim().toLowerCase();
  if (!normalized) return "";
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return "";
  }
}

/** Formata telefone brasileiro para padrão E.164 (+55...) antes do hash */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) return `+${digits}`;
  return `+55${digits}`;
}

/** Registra visualização de página no Pixel do TikTok */
export function trackTikTokPage(): void {
  if (typeof window !== "undefined" && window.ttq?.page) {
    try {
      window.ttq.page();
    } catch (e) {
      console.warn("[TikTok Pixel] Error tracking page:", e);
    }
  }
}

/** Registra um evento no Pixel do TikTok (client-side) */
export function trackTikTokEvent(
  eventName: string,
  properties: Record<string, unknown> = {},
  eventId?: string
): void {
  if (typeof window !== "undefined" && window.ttq?.track) {
    try {
      if (eventId) {
        window.ttq.track(eventName, properties, { event_id: eventId });
      } else {
        window.ttq.track(eventName, properties);
      }
    } catch (e) {
      console.warn(`[TikTok Pixel] Error tracking event ${eventName}:`, e);
    }
  }
}

/** Identifica o usuário para Advanced Matching no Pixel */
export function identifyTikTok(traits: {
  email?: string;
  phone?: string;
  externalId?: string;
}): void {
  if (typeof window !== "undefined" && window.ttq?.identify) {
    try {
      const payload: Record<string, unknown> = {};
      if (traits.email) payload.email = traits.email.trim().toLowerCase();
      if (traits.phone) payload.phone_number = normalizePhone(traits.phone);
      if (traits.externalId) payload.external_id = traits.externalId;
      window.ttq.identify(payload);
    } catch (e) {
      console.warn("[TikTok Pixel] Error in identify:", e);
    }
  }
}

export type TikTokServerEventParams = {
  event: string;
  eventId?: string;
  amount?: number;
  currency?: string;
  email?: string;
  phone?: string;
  ttclid?: string;
  ip?: string;
  userAgent?: string;
  contents?: Array<{
    content_id: string;
    content_name: string;
    price: number;
    quantity: number;
  }>;
};

/**
 * Envia evento server-side via TikTok Events API (Conversions API).
 * Usa o Access Token fornecido para enviar conversões confiáveis diretamente.
 */
export async function sendTikTokServerEvent(params: TikTokServerEventParams): Promise<{ ok: boolean; error?: string }> {
  try {
    const hashedEmail = params.email ? await sha256(params.email) : undefined;
    const hashedPhone = params.phone ? await sha256(normalizePhone(params.phone)) : undefined;

    const user: Record<string, unknown> = {};
    if (params.ttclid) user.ttclid = params.ttclid;
    if (hashedEmail) user.email = hashedEmail;
    if (hashedPhone) user.phone_number = hashedPhone;
    if (params.ip) user.client_ip_address = params.ip;
    if (params.userAgent) user.client_user_agent = params.userAgent;

    const payload = {
      event_source: "web",
      event_source_id: TIKTOK_PIXEL_ID,
      data: [
        {
          event: params.event,
          event_time: Math.floor(Date.now() / 1000),
          event_id: params.eventId || `tt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          user,
          properties: {
            currency: params.currency || "BRL",
            value: params.amount ?? 137.9,
            content_type: "product",
            contents: params.contents || [
              {
                content_id: "kart-velox",
                content_name: "Kart Velox 4 rodas",
                price: params.amount ?? 137.9,
                quantity: 1,
              },
            ],
          },
        },
      ],
    };

    const res = await fetch("https://business-api.tiktok.com/open_api/v1.3/event/track/", {
      method: "POST",
      headers: {
        "Access-Token": TIKTOK_ACCESS_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.warn("[TikTok Events API] Response status:", res.status, errorText);
      return { ok: false, error: errorText };
    }

    const data = await res.json();
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[TikTok Events API] Error dispatching event:", message);
    return { ok: false, error: message };
  }
}
