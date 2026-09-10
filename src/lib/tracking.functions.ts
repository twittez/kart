import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  buildCycle,
  generateTrackingCode,
  type CycleEvent,
  type TrackingPhase,
} from "./tracking-cycle";

export { generateTrackingCode };

/**
 * Código determinístico a partir de uma string (fallback quando o pedido
 * ainda não tem código salvo). Formato: BR000000000BR.
 */
export function trackingCodeFor(input: string): string {
  const s = (input || "").trim().toLowerCase();
  let h1 = 0x811c9dc5 >>> 0;
  let h2 = 0x1b873593 >>> 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x85ebca6b) >>> 0;
  }
  const hex =
    h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
  const digits = (parseInt(hex.slice(0, 12), 16) % 1_000_000_000)
    .toString()
    .padStart(9, "0");
  return `BR${digits}BR`;
}

const LookupSchema = z.object({
  /** Código de rastreio, CPF (com ou sem pontuação) ou e-mail da compra. */
  query: z.string().trim().min(3).max(120).optional(),
  email: z.string().trim().optional(),
  code: z.string().trim().optional(),
});

export type TrackingEvent = CycleEvent;

export type TrackingResult = {
  found: boolean;
  code?: string;
  phase?: TrackingPhase;
  productName?: string;
  city?: string | null;
  state?: string | null;
  paidAt?: string | null;
  etaDate?: string | null;
  etaDays?: number;
  events?: TrackingEvent[];
};

const onlyDigits = (v: string) => v.replace(/\D+/g, "");

export const lookupTracking = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => LookupSchema.parse(data))
  .handler(async ({ data }): Promise<TrackingResult> => {
    const raw = (data.query || data.code || data.email || "").trim();
    if (!raw) return { found: false };

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { sha256Hex } = await import("@/utils/tiktok.server");

    const digits = onlyDigits(raw);
    let order: any = null;

    const pick = (rows: any[] | null | undefined) => {
      const list = rows ?? [];
      // Prioriza pedidos já pagos.
      return list.find((r) => !!r.paid_at) ?? list[0] ?? null;
    };

    try {
      // 1) Código de rastreio
      if (/^BR\d{9}BR$/i.test(raw)) {
        const { data: rows } = await (supabaseAdmin.from("pix_orders") as any)
          .select("*")
          .eq("tracking_code", raw.toUpperCase())
          .order("created_at", { ascending: false })
          .limit(5);
        order = pick(rows);

        // Pedidos antigos, sem código salvo: reconhece o código derivado.
        if (!order) {
          const { data: recent } = await (supabaseAdmin.from("pix_orders") as any)
            .select("*")
            .is("tracking_code", null)
            .order("created_at", { ascending: false })
            .limit(2000);
          const target = raw.toUpperCase();
          order =
            (recent ?? []).find(
              (r: any) => trackingCodeFor(r.external_ref || r.id) === target,
            ) ?? null;
        }
      }

      // 2) CPF (11 dígitos) — comparado pelo hash salvo no pedido
      if (!order && digits.length === 11) {
        const { data: rows } = await (supabaseAdmin.from("pix_orders") as any)
          .select("*")
          .eq("cpf_hash", sha256Hex(digits))
          .order("created_at", { ascending: false })
          .limit(5);
        order = pick(rows);
      }

      // 3) E-mail da compra
      if (!order && raw.includes("@")) {
        const { data: rows } = await (supabaseAdmin.from("pix_orders") as any)
          .select("*")
          .ilike("customer_email", raw)
          .order("created_at", { ascending: false })
          .limit(5);
        order = pick(rows);
      }
    } catch (e) {
      console.error("[rastreio] lookup failed", e);
      return { found: false };
    }

    if (!order) return { found: false };

    const code: string =
      order.tracking_code || trackingCodeFor(order.external_ref || order.id);

    // Garante que o pedido tenha o código salvo para as próximas consultas.
    if (!order.tracking_code) {
      try {
        await (supabaseAdmin.from("pix_orders") as any)
          .update({ tracking_code: code })
          .eq("id", order.id);
      } catch {
        /* não bloqueia a consulta */
      }
    }

    const cycle = buildCycle(order.paid_at, code);
    const etaDays = cycle.deliveryEstimateAt
      ? Math.max(
          0,
          Math.ceil(
            (new Date(cycle.deliveryEstimateAt).getTime() - Date.now()) /
              (24 * 3600 * 1000),
          ),
        )
      : undefined;

    return {
      found: true,
      code,
      phase: cycle.phase,
      productName: order.product_name ?? "Seu pedido",
      city: order.address_city ?? null,
      state: order.address_state ?? null,
      paidAt: order.paid_at ?? null,
      etaDate: cycle.deliveryEstimateAt || null,
      etaDays,
      events: cycle.events,
    };
  });
