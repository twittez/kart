// ============================================================
// VERSÃO DEMO (SOMENTE VISUAL) — SEM GATEWAY DE PAGAMENTO
// ------------------------------------------------------------
// Este arquivo substitui a integração real de pagamento por
// funções de demonstração, para que todas as telas da oferta
// (checkout, PIX, upsell) funcionem visualmente sem nenhuma
// API, chave ou banco de dados configurado.
//
// Para ligar um gateway real, troque as funções abaixo pela
// integração desejada, mantendo os mesmos nomes e retornos.
// ============================================================
import { createServerFn } from "@tanstack/react-start";

type DemoSession = { sessionId: string; amountCents: number; trackingCode: string };

function randomHex(len: number) {
  let out = "";
  for (let i = 0; i < len; i++) out += "0123456789ABCDEF"[Math.floor(Math.random() * 16)];
  return out;
}

function makeTrackingCode() {
  let digits = "";
  for (let i = 0; i < 9; i++) digits += Math.floor(Math.random() * 10);
  return `BR${digits}BR`;
}

/** O id da sessão carrega o valor, para a tela do PIX exibir o total correto. */
function encodeSession(amountCents: number): DemoSession {
  const trackingCode = makeTrackingCode();
  return {
    sessionId: `demo-${amountCents}-${trackingCode}-${randomHex(6)}`,
    amountCents,
    trackingCode,
  };
}

function decodeSession(sessionId: string): DemoSession {
  const parts = sessionId.split("-");
  const amountCents = Number(parts[1]) || 13790;
  const trackingCode = parts[2] || makeTrackingCode();
  return { sessionId, amountCents, trackingCode };
}

/** Código PIX fictício, apenas para renderizar o QR Code na tela. */
function fakePixCode(sessionId: string, amountCents: number) {
  const value = (amountCents / 100).toFixed(2);
  return `00020126DEMO-PIX-VISUAL-ONLY${sessionId}5204000053039865802BR5913NOVA ERA DEMO6009SAO PAULO54${value}6304DEMO`;
}

export const createPixTransaction = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => data as Record<string, unknown>)
  .handler(async ({ data }) => {
    const d = data as {
      amountCents?: number;
      name?: string;
      email?: string;
      phone?: string;
      shipping?: {
        street?: string;
        streetNumber?: string;
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
    };
    const session = encodeSession(d.amountCents ?? 13790);

    try {
      const { addLocalOrder } = await import("./admin.server");
      addLocalOrder({
        id: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        created_at: new Date().toISOString(),
        paid_at: null,
        status: "pending",
        amount_cents: session.amountCents,
        product_name: "Kart Velox 4 rodas",
        product_color: "Preto",
        external_ref: session.sessionId,
        transaction_id: `tx_${session.trackingCode}`,
        gateway: "primecash",
        customer_name: d.name ?? null,
        customer_email: d.email ?? null,
        customer_phone: d.phone ?? null,
        address_street: d.shipping?.street ?? null,
        address_number: d.shipping?.streetNumber ?? null,
        address_complement: null,
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
        traffic_source: d.attribution?.ttclid || (d.attribution?.utmSource || "").toLowerCase().includes("tiktok") ? "tiktok" : d.attribution?.gclid ? "google" : "direct",
        pix_copied_at: null,
        tracking_code: session.trackingCode,
        logistics_status: "Aguardando pagamento",
      });
    } catch {
      // safe
    }

    return { ok: true as const, sessionId: session.sessionId, error: "" };
  });

export const createUpsellPixTransaction = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => data as { sessionId?: string })
  .handler(async () => {
    const session = encodeSession(9653);
    return { ok: true as const, sessionId: session.sessionId, error: "" };
  });

export const getCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => data as { sessionId: string })
  .handler(async ({ data }) => {
    const s = decodeSession(data.sessionId);
    return {
      ok: true as const,
      qrCode: fakePixCode(s.sessionId, s.amountCents),
      qrImage: "",
      amountCents: s.amountCents,
      trackingCode: s.trackingCode,
      error: "",
    };
  });

export const getTransactionStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => data as { sessionId: string })
  .handler(async () => {
    // Demo: o pedido permanece aguardando pagamento.
    return {
      ok: true as const,
      status: "pending" as string,
      ttEventId: "" as string,
      externalRef: "" as string,
      error: "",
    };
  });

export const markPixCopied = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => data as { sessionId: string })
  .handler(async () => ({ ok: true as const }));

export const uploadPaymentProof = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => data as { sessionId: string; imageData: string; mimeType?: string })
  .handler(async () => ({ ok: true as const, error: "" }));
