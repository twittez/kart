// Server-only: gerenciamento de transações Pix, sessões e auto-sync com Beehive e AxxonPay.
import { getGatewaySettings } from "@/utils/gateway-settings.server";
import { createBeehivePix, getBeehivePaymentStatus } from "@/utils/beehive.server";
import { createAxxonPix, getAxxonPaymentStatus } from "@/utils/axxon.server";
import { addLocalOrder, localOrders, type OrderRow } from "@/utils/admin.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendTikTokPurchase } from "@/utils/tiktok.server";

export type StoredSession = {
  sessionId: string;
  orderId: string;
  amountCents: number;
  trackingCode: string;
  qrCode: string;
  qrImage: string;
  transactionId: string;
  gateway: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerName?: string | null;
  createdAt: number;
};

// Sessões em memória
export const sessionsMap = new Map<string, StoredSession>();

export function makeTrackingCode(): string {
  let digits = "";
  for (let i = 0; i < 9; i++) digits += Math.floor(Math.random() * 10);
  return `BR${digits}BR`;
}

function randomHex(len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) out += "0123456789ABCDEF"[Math.floor(Math.random() * 16)];
  return out;
}

export function emergencyPixCode(sessionId: string, amountCents: number): string {
  const val = (amountCents / 100).toFixed(2);
  return `00020126580014BR.GOV.BCB.PIX0136kart-${sessionId}5204000053039865802BR5913KART VELOX BR6009SAO PAULO54${val}6304${randomHex(4)}`;
}

export async function markOrderAsPaid(identifier: string): Promise<boolean> {
  const now = new Date().toISOString();
  let foundOrder: OrderRow | null = null;

  for (const o of localOrders) {
    if (o.id === identifier || o.external_ref === identifier || o.transaction_id === identifier) {
      if (o.status !== "paid") {
        o.status = "paid";
        o.paid_at = now;
        o.logistics_status = "Em separação";
      }
      foundOrder = o;
      break;
    }
  }

  try {
    const { data: updated } = await (supabaseAdmin.from("pix_orders") as any)
      .update({
        status: "paid",
        paid_at: now,
        logistics_status: "Em separação",
        updated_at: now,
      })
      .or(`id.eq.${identifier},external_ref.eq.${identifier},transaction_id.eq.${identifier}`)
      .select("*");

    if (Array.isArray(updated) && updated.length > 0 && !foundOrder) {
      foundOrder = updated[0] as OrderRow;
    }
  } catch (err) {
    console.warn("[supabase] error updating order to paid:", err);
  }

  if (foundOrder && !(foundOrder as any).tt_event_sent) {
    try {
      await sendTikTokPurchase({
        amountCents: foundOrder.amount_cents,
        currency: "BRL",
        externalRef: foundOrder.external_ref,
        productName: foundOrder.product_name,
        clientIp: null,
        userAgent: foundOrder.user_agent,
        ttclid: foundOrder.ttclid,
        ttp: foundOrder.ttp,
        pageUrl: `https://lojaeranovakt.site/checkout/pix?s=${foundOrder.external_ref}`,
        eventId: foundOrder.external_ref,
      });
      (foundOrder as any).tt_event_sent = true;
    } catch {
      // safe
    }
  }

  return true;
}

export async function processCreatePix(d: {
  amountCents?: number;
  name?: string;
  email?: string;
  phone?: string;
  cpf?: string;
  shipping?: {
    street?: string;
    streetNumber?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  attribution?: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    ttclid?: string;
    gclid?: string;
  };
  color?: string;
  voltage?: string;
}) {
  const amountCents = Number(d.amountCents) || 13790;
  const trackingCode = makeTrackingCode();
  const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const customer = {
    name: (d.name || "Cliente Kart").trim(),
    email: (d.email || "cliente@kart.com.br").trim(),
    phone: (d.phone || "11999999999").replace(/\D/g, ""),
    cpf: (d.cpf || "08852175350").replace(/\D/g, ""),
    address: {
      street: d.shipping?.street,
      number: d.shipping?.streetNumber,
      neighborhood: d.shipping?.neighborhood,
      city: d.shipping?.city,
      state: d.shipping?.state,
      cep: d.shipping?.zipCode,
    },
  };

  const gwConfig = await getGatewaySettings().catch(() => ({
    active: "axxon" as const,
    fallback: ["beehive" as const],
  }));

  const primaryGateway = gwConfig.active || "axxon";
  const secondaryGateway =
    gwConfig.fallback[0] || (primaryGateway === "axxon" ? "beehive" : "axxon");

  let finalQrCode = "";
  let finalQrImage = "";
  let finalTxId = "";
  let gatewayUsed = primaryGateway;

  async function attemptGateway(gw: string) {
    if (gw === "beehive") {
      console.log(`[Payment Router] Gerando Pix via BEEHIVE para pedido ${orderId}...`);
      const bhRes = await createBeehivePix({
        amountCents,
        productName: "Kart Velox 4 rodas",
        orderId,
        trackingCode,
        customer,
        utm: d.attribution,
        postbackUrl: "https://lojaeranovakt.site/api/webhooks/beehive",
      });
      if (bhRes.ok && bhRes.qrCode) {
        return {
          qrCode: bhRes.qrCode,
          qrImage:
            bhRes.qrImage ||
            `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(bhRes.qrCode)}`,
          transactionId: bhRes.transactionId || `BH-${Date.now()}`,
          gateway: "beehive",
        };
      }
    } else if (gw === "axxon") {
      console.log(`[Payment Router] Gerando Pix via AXXONPAY para pedido ${orderId}...`);
      const axRes = await createAxxonPix({
        amountCents,
        productName: "Kart Velox 4 rodas",
        externalRef: orderId,
        postbackUrl: "https://lojaeranovakt.site/api/webhooks/axxonpay",
        clientIp: null,
        customer: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          cpf: customer.cpf,
        },
      });
      if (axRes.ok && axRes.qrCode) {
        return {
          qrCode: axRes.qrCode,
          qrImage: axRes.qrImage,
          transactionId: axRes.transactionId,
          gateway: "axxon",
        };
      }
    }
    return null;
  }

  const res1 = await attemptGateway(primaryGateway);
  if (res1) {
    finalQrCode = res1.qrCode;
    finalQrImage = res1.qrImage;
    finalTxId = res1.transactionId;
    gatewayUsed = res1.gateway as any;
    console.log(`[Payment Router] Pix gerado via ${gatewayUsed}! TxID: ${finalTxId}`);
  } else {
    console.warn(`[Payment Router] Falha no gateway primário (${primaryGateway}). Acionando fallback: ${secondaryGateway}...`);
    const res2 = await attemptGateway(secondaryGateway);
    if (res2) {
      finalQrCode = res2.qrCode;
      finalQrImage = res2.qrImage;
      finalTxId = res2.transactionId;
      gatewayUsed = res2.gateway as any;
      console.log(`[Payment Router] Pix gerado via Fallback (${gatewayUsed})! TxID: ${finalTxId}`);
    } else {
      console.error("[Payment Router] Todos os gateways falharam! Ativando QR Code de emergência.");
      finalQrCode = emergencyPixCode(sessionId, amountCents);
      finalQrImage = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(finalQrCode)}`;
      finalTxId = `EMG-${Date.now()}`;
      gatewayUsed = "primecash";
    }
  }

  sessionsMap.set(sessionId, {
    sessionId,
    orderId,
    amountCents,
    trackingCode,
    qrCode: finalQrCode,
    qrImage: finalQrImage,
    transactionId: finalTxId,
    gateway: gatewayUsed,
    customerEmail: d.email || null,
    customerPhone: d.phone || null,
    customerName: d.name || null,
    createdAt: Date.now(),
  });

  const nowIso = new Date().toISOString();
  const newOrder: OrderRow = {
    id: orderId,
    created_at: nowIso,
    paid_at: null,
    status: "pending",
    amount_cents: amountCents,
    product_name: "Kart Velox 4 rodas",
    product_color: d.color || "Preto",
    external_ref: sessionId,
    transaction_id: finalTxId,
    gateway: gatewayUsed,
    customer_name: d.name ?? null,
    customer_email: d.email ?? null,
    customer_phone: d.phone ?? null,
    customer_cpf: d.cpf ?? null,
    address_street: d.shipping?.street ?? null,
    address_number: d.shipping?.streetNumber ?? null,
    address_complement: d.shipping?.complement ?? null,
    address_neighborhood: d.shipping?.neighborhood ?? null,
    address_city: d.shipping?.city ?? null,
    address_state: d.shipping?.state ?? null,
    address_zipcode: d.shipping?.zipCode ?? null,
    utm_source: d.attribution?.utmSource ?? null,
    utm_medium: d.attribution?.utmMedium ?? null,
    utm_campaign: d.attribution?.utmCampaign ?? null,
    utm_content: d.attribution?.utmContent ?? null,
    fbclid: null,
    gclid: d.attribution?.gclid ?? null,
    ttclid: d.attribution?.ttclid ?? null,
    fbc: null,
    ttp: null,
    user_agent: null,
    device: "mobile",
    traffic_source:
      d.attribution?.ttclid || (d.attribution?.utmSource || "").toLowerCase().includes("tiktok")
        ? "tiktok"
        : d.attribution?.gclid
          ? "google"
          : "direct",
    pix_copied_at: null,
    tracking_code: trackingCode,
    logistics_status: "Aguardando pagamento",
  };

  addLocalOrder(newOrder);

  try {
    await (supabaseAdmin.from("pix_orders") as any).insert({
      id: newOrder.id,
      created_at: newOrder.created_at,
      paid_at: null,
      status: newOrder.status,
      amount_cents: newOrder.amount_cents,
      currency: "BRL",
      product_name: newOrder.product_name,
      product_color: newOrder.product_color,
      external_ref: newOrder.external_ref,
      transaction_id: newOrder.transaction_id,
      gateway: newOrder.gateway,
      customer_name: newOrder.customer_name,
      customer_email: newOrder.customer_email,
      customer_phone: newOrder.customer_phone,
      customer_cpf: newOrder.customer_cpf,
      address_street: newOrder.address_street,
      address_number: newOrder.address_number,
      address_complement: newOrder.address_complement,
      address_neighborhood: newOrder.address_neighborhood,
      address_city: newOrder.address_city,
      address_state: newOrder.address_state,
      address_zipcode: newOrder.address_zipcode,
      utm_source: newOrder.utm_source,
      utm_medium: newOrder.utm_medium,
      utm_campaign: newOrder.utm_campaign,
      utm_content: newOrder.utm_content,
      device: newOrder.device,
      traffic_source: newOrder.traffic_source,
      tracking_code: newOrder.tracking_code,
      logistics_status: newOrder.logistics_status,
    });
  } catch (err) {
    console.warn("[supabase] order insert fallback:", err);
  }

  return { ok: true as const, sessionId, error: "" };
}

export async function processGetCheckoutSession(sessionId: string) {
  const session = sessionsMap.get(sessionId);

  if (session) {
    return {
      ok: true as const,
      qrCode: session.qrCode,
      qrImage: session.qrImage,
      amountCents: session.amountCents,
      trackingCode: session.trackingCode,
      error: "",
    };
  }

  try {
    const { data: row } = await (supabaseAdmin.from("pix_orders") as any)
      .select("*")
      .or(`external_ref.eq.${sessionId},id.eq.${sessionId}`)
      .maybeSingle();

    if (row) {
      const qrCode = (row as any).pix_code || emergencyPixCode(sessionId, row.amount_cents || 13790);
      const qrImage =
        (row as any).qr_code_image ||
        `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrCode)}`;

      return {
        ok: true as const,
        qrCode,
        qrImage,
        amountCents: row.amount_cents || 13790,
        trackingCode: row.tracking_code || makeTrackingCode(),
        error: "",
      };
    }
  } catch {
    // safe
  }

  const fallbackCode = emergencyPixCode(sessionId, 13790);
  return {
    ok: true as const,
    qrCode: fallbackCode,
    qrImage: `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(fallbackCode)}`,
    amountCents: 13790,
    trackingCode: makeTrackingCode(),
    error: "",
  };
}

export async function processGetTransactionStatus(sessionId: string) {
  const session = sessionsMap.get(sessionId);

  const local = localOrders.find((o) => o.external_ref === sessionId || o.id === sessionId);
  if (local && (local.status === "paid" || local.status === "approved")) {
    return {
      ok: true as const,
      status: "paid" as string,
      ttEventId: sessionId,
      externalRef: sessionId,
      error: "",
    };
  }

  try {
    const { data: dbOrder } = await (supabaseAdmin.from("pix_orders") as any)
      .select("status, transaction_id, gateway")
      .or(`external_ref.eq.${sessionId},id.eq.${sessionId}`)
      .maybeSingle();

    if (dbOrder && (dbOrder.status === "paid" || dbOrder.status === "approved")) {
      await markOrderAsPaid(sessionId);
      return {
        ok: true as const,
        status: "paid" as string,
        ttEventId: sessionId,
        externalRef: sessionId,
        error: "",
      };
    }

    const txId = session?.transactionId || dbOrder?.transaction_id;
    const gw = session?.gateway || dbOrder?.gateway;

    if (txId) {
      if (gw === "beehive" || (!gw && txId.startsWith("BH-"))) {
        const bhStatus = await getBeehivePaymentStatus(txId);
        if (bhStatus.ok && bhStatus.status === "paid") {
          console.log(`[Auto-Sync Beehive] Pedido ${sessionId} identificado como PAGO!`);
          await markOrderAsPaid(sessionId);
          return {
            ok: true as const,
            status: "paid" as string,
            ttEventId: sessionId,
            externalRef: sessionId,
            error: "",
          };
        }
      } else if (gw === "axxon") {
        const axStatus = await getAxxonPaymentStatus(txId);
        if (axStatus.ok && axStatus.status === "paid") {
          console.log(`[Auto-Sync AxxonPay] Pedido ${sessionId} identificado como PAGO!`);
          await markOrderAsPaid(sessionId);
          return {
            ok: true as const,
            status: "paid" as string,
            ttEventId: sessionId,
            externalRef: sessionId,
            error: "",
          };
        }
      }
    }
  } catch (err) {
    console.warn("[transactionStatus check error]:", err);
  }

  return {
    ok: true as const,
    status: "pending" as string,
    ttEventId: sessionId,
    externalRef: sessionId,
    error: "",
  };
}
