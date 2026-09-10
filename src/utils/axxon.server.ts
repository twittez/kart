// ---- AxxonPay (Pagamentos Diretos) ----
// Docs: https://axxonpay.readme.io/reference/createdirectpayment
// - Base URL: https://api.axxonpay.com.br
// - Auth: headers `axxon-gateway-publickey` + `axxon-gateway-secretkey`
// - Valores em CENTAVOS
//
// Estas funções são chamadas por `primecash.functions.ts` quando
// ACTIVE_GATEWAY === "axxon". Elas devolvem objetos no mesmo formato
// dos outros gateways (qrCode / qrImage / transactionId / status).

import { z } from "zod";

const AXXON_BASE = "https://api.axxonpay.com.br";

const axxonInputSchema = z.object({
  amountCents: z.number(),
  productName: z.string(),
  externalRef: z.string(),
  postbackUrl: z.string().nullable(),
  clientIp: z.string().nullable(),
  customer: z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    cpf: z.string(),
  }),
});

export type AxxonPixInput = z.infer<typeof axxonInputSchema>;

export const DEFAULT_AXXONPAY_PUBLIC_KEY = process.env.AXXONPAY_PUBLIC_KEY || process.env.AXXON_PUBLIC_KEY || "";
export const DEFAULT_AXXONPAY_SECRET_KEY = process.env.AXXONPAY_SECRET_KEY || process.env.AXXON_SECRET_KEY || "";

function keys() {
  const publicKey = DEFAULT_AXXONPAY_PUBLIC_KEY;
  const secretKey = DEFAULT_AXXONPAY_SECRET_KEY;
  return { publicKey, secretKey };
}

function authHeaders(publicKey: string, secretKey: string) {
  return {
    "axxon-gateway-publickey": publicKey,
    "axxon-gateway-secretkey": secretKey,
    "content-type": "application/json",
    accept: "application/json",
  };
}

/** Normaliza os status da Axxon (PENDING/FINISHED/PAID/FAILED/...) para os
 *  status internos usados pelo checkout. */
export function normalizeAxxonStatus(raw: unknown): string {
  const s = String(raw ?? "").toUpperCase();
  if (["PAID", "FINISHED", "APPROVED", "COMPLETED", "SUCCEEDED"].includes(s)) return "paid";
  if (["FAILED", "REFUSED", "DENIED", "ERROR"].includes(s)) return "refused";
  if (["CANCELLED", "CANCELED", "EXPIRED"].includes(s)) return "canceled";
  if (["REFUNDED", "DISPUTE_OPEN", "CHARGEBACK", "DISPUTE_LOST"].includes(s)) return "chargedback";
  return "pending";
}

export async function createAxxonPix(input: AxxonPixInput) {
  const { publicKey, secretKey } = keys();
  if (!publicKey || !secretKey) {
    console.error("Axxon gateway keys not configured");
    return { ok: false as const, error: "Configuração do gateway Axxon pendente." };
  }

  const body: Record<string, unknown> = {
    amount: input.amountCents,
    paymentMethod: "pix",
    description: input.productName,
    customer: {
      name: input.customer.name,
      email: input.customer.email,
      phone: input.customer.phone.replace(/\D/g, ""),
      document: { number: input.customer.cpf.replace(/\D/g, ""), type: "cpf" },
    },
    metadata: {
      order_id: input.externalRef,
      product: input.productName,
      ...(input.clientIp ? { client_ip: input.clientIp } : {}),
    },
  };
  if (input.postbackUrl) body.postbackUrl = input.postbackUrl;

  try {
    const res = await fetch(`${AXXON_BASE}/api/v1/direct/payment`, {
      method: "POST",
      headers: authHeaders(publicKey, secretKey),
      body: JSON.stringify(body),
    });

    const raw = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(raw);
    } catch {
      // not json
    }

    if (!res.ok) {
      console.error("Axxon PIX error:", res.status, raw.slice(0, 600));
      return {
        ok: false as const,
        error: "Não foi possível processar o pagamento. Tente novamente.",
      };
    }

    const d = json?.data ?? json;
    const qrCode: string | null =
      d?.qrCode || d?.qrcode || d?.pix?.qrCode || d?.pix?.qrcode || d?.pix?.payload || null;
    const qrImage: string | null =
      d?.qrCodeImage || d?.qrcodeImage || d?.pix?.qrCodeImage || d?.pix?.base64 || null;
    const transactionId = String(d?.id || d?.paymentId || d?.externalId || "");

    if (!qrCode) {
      console.error("Axxon: missing pix payload", raw.slice(0, 600));
      return {
        ok: false as const,
        error: "Não foi possível processar o pagamento. Tente novamente.",
      };
    }

    const finalQrImage =
      qrImage ||
      `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrCode)}`;

    return { ok: true as const, qrCode, qrImage: finalQrImage, transactionId };
  } catch (err) {
    console.error("Axxon request failed:", err);
    return { ok: false as const, error: "Não foi possível processar o pagamento. Tente novamente." };
  }
}

export async function getAxxonPaymentStatus(paymentId: string) {
  const { publicKey, secretKey } = keys();
  try {
    const res = await fetch(
      `${AXXON_BASE}/api/v1/payments/${encodeURIComponent(paymentId)}`,
      {
        method: "GET",
        headers:
          publicKey && secretKey
            ? authHeaders(publicKey, secretKey)
            : { accept: "application/json" },
      }
    );
    const raw = await res.text();
    if (!res.ok) {
      console.error("Axxon status error:", res.status, raw.slice(0, 400));
      return { ok: false as const, error: "Pagamento indisponível no momento. Tente novamente." };
    }
    let json: any = null;
    try {
      json = JSON.parse(raw);
    } catch {
      return { ok: true as const, status: "pending", paidAt: null };
    }
    const d = json?.data ?? json;
    const status = normalizeAxxonStatus(d?.status);
    const paidAt: string | null = d?.confirmedAt || d?.paidAt || (status === "paid" ? new Date().toISOString() : null);
    return { ok: true as const, status, paidAt };
  } catch (err) {
    console.error("Axxon status request failed:", err);
    return { ok: false as const, error: "Pagamento indisponível no momento. Tente novamente." };
  }
}
