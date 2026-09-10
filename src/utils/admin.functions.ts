import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { isAdminCookieValid, ADMIN_COOKIE_NAME } from "./tiktok.server";

function adminOk(): boolean {
  const token = (() => {
    try {
      return getCookie(ADMIN_COOKIE_NAME);
    } catch {
      return undefined;
    }
  })();
  return isAdminCookieValid(token);
}

const rangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

const ordersSchema = rangeSchema.extend({
  q: z.string().max(120).optional(),
  status: z.enum(["all", "paid", "pending", "canceled"]).default("all"),
  source: z.enum(["all", "tiktok", "google", "direct"]).default("all"),
});

/** Admin: lista de pedidos com filtros. */
export const adminListOrders = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => ordersSchema.parse(raw))
  .handler(async ({ data }) => {
    if (!adminOk()) return { ok: false as const, error: "unauthorized" };
    const { listOrders } = await import("./admin.server");
    const orders = await listOrders(data);
    return { ok: true as const, orders };
  });

/** Admin: relatório de tráfego + vendas dia a dia + campanhas. */
export const adminTrafficReport = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => rangeSchema.parse(raw))
  .handler(async ({ data }) => {
    if (!adminOk()) return { ok: false as const, error: "unauthorized" };
    const { getTrafficReport } = await import("./admin.server");
    const report = await getTrafficReport(data.from, data.to);
    return { ok: true as const, report };
  });

const logisticsSchema = z.object({
  id: z.string().uuid(),
  trackingCode: z.string().max(80).nullable().optional(),
  logisticsStatus: z.string().max(60).nullable().optional(),
});

/** Admin: atualiza rastreio / status logístico. */
export const adminUpdateLogistics = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => logisticsSchema.parse(raw))
  .handler(async ({ data }) => {
    if (!adminOk()) return { ok: false as const, error: "unauthorized" };
    const { updateOrderLogistics } = await import("./admin.server");
    const ok = await updateOrderLogistics(data);
    return ok ? { ok: true as const } : { ok: false as const, error: "falha ao salvar" };
  });

/** Admin: cartões recusados (módulo preparado). */
export const adminListDeclinedCards = createServerFn({ method: "GET" }).handler(async () => {
  if (!adminOk()) return { ok: false as const, error: "unauthorized" };
  const { listDeclinedCards } = await import("./admin.server");
  const cards = await listDeclinedCards();
  return { ok: true as const, cards };
});

/** Admin: exclui/descarta um cartão recusado. */
export const adminDeleteDeclinedCard = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ id: z.string() }).parse(raw))
  .handler(async ({ data }) => {
    if (!adminOk()) return { ok: false as const, error: "unauthorized" };
    const { deleteDeclinedCard } = await import("./admin.server");
    const ok = await deleteDeclinedCard(data.id);
    return { ok: true as const, success: ok };
  });

// ---- Gateways ----

const gatewayEnum = z.enum(["axxon", "winner", "primecash"]);

/** Admin: configuração atual de gateway (ativo + ordem de fallback). */
export const adminGetGateways = createServerFn({ method: "GET" }).handler(async () => {
  if (!adminOk()) return { ok: false as const, error: "unauthorized" };
  const { getGatewaySettings } = await import("./gateway-settings.server");
  return { ok: true as const, settings: await getGatewaySettings() };
});

/** Admin: troca o gateway ativo e a ordem de fallback. */
export const adminSetGateways = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({ active: gatewayEnum, fallback: z.array(gatewayEnum).default([]) }).parse(raw)
  )
  .handler(async ({ data }) => {
    if (!adminOk()) return { ok: false as const, error: "unauthorized" };
    const { setGatewaySettings } = await import("./gateway-settings.server");
    return { ok: true as const, settings: await setGatewaySettings(data) };
  });

// ---- Comprovantes ----

/** Admin: lista comprovantes enviados pelos clientes. */
export const adminListProofs = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) =>
    z.object({ status: z.enum(["all", "pending", "approved", "rejected"]).default("pending") }).parse(raw)
  )
  .handler(async ({ data }) => {
    if (!adminOk()) return { ok: false as const, error: "unauthorized" };
    const { listProofs } = await import("./proofs.server");
    return { ok: true as const, proofs: await listProofs(data.status) };
  });

/** Admin: aprova o comprovante, marca pago e dispara as conversões. */
export const adminApproveProof = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    if (!adminOk()) return { ok: false as const, error: "unauthorized" };
    const { approveProof } = await import("./proofs.server");
    return await approveProof(data.id);
  });

/** Admin: recusa o comprovante. */
export const adminRejectProof = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid(), note: z.string().max(300).optional() }).parse(raw)
  )
  .handler(async ({ data }) => {
    if (!adminOk()) return { ok: false as const, error: "unauthorized" };
    const { rejectProof } = await import("./proofs.server");
    return await rejectProof(data.id, data.note);
  });

/** Admin: status das integrações (pixels, gateways, conversões pendentes). */
export const adminIntegrationsStatus = createServerFn({ method: "GET" }).handler(async () => {
  if (!adminOk()) return { ok: false as const, error: "unauthorized" };
  const { getIntegrationsStatus } = await import("./admin.server");
  return { ok: true as const, status: await getIntegrationsStatus() };
});

/** Admin: reenvia manualmente as conversões de um pedido pago. */
export const adminResendConversions = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ orderId: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    if (!adminOk()) return { ok: false as const, error: "unauthorized" };
    const { resendConversions } = await import("./admin.server");
    return await resendConversions(data.orderId);
  });

/** Admin: gera um Pix de teste de R$ 6,00 no gateway escolhido. */
export const TEST_PIX_AMOUNT_CENTS = 600;

export const adminTestPix = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ gateway: gatewayEnum }).parse(raw))
  .handler(async ({ data }) => {
    if (!adminOk()) return { ok: false as const, error: "unauthorized" };
    const amountCents = 600;
    const externalRef = `TEST_${Date.now()}_${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
    const productName = "Teste de gateway";
    const customer = {
      name: "Teste Painel",
      email: "teste@novaera.com.br",
      phone: "51999999999",
      cpf: "01234567890",
    };

    if (data.gateway === "axxon") {
      const { createAxxonPix } = await import("./axxon.server");
      const r = await createAxxonPix({
        amountCents,
        productName,
        externalRef,
        postbackUrl: null,
        clientIp: null,
        customer,
      });
      return r.ok
        ? { ok: true as const, amountCents, qrCode: r.qrCode, transactionId: String(r.transactionId ?? "") }
        : { ok: false as const, error: r.error };
    }

    if (data.gateway === "winner") {
      const { createWinnerPix } = await import("./winner.server");
      const r = await createWinnerPix({
        amountCents,
        productName,
        externalRef,
        postbackUrl: null,
        clientIp: null,
        customer: {
          ...customer,
          address: {
            street: "Av. General Osorio",
            streetNumber: "1139",
            complement: null,
            zipCode: "96400100",
            neighborhood: "Centro",
            city: "Bage",
            state: "RS",
            country: "BR",
          },
        },
        items: [{ title: productName, unitPrice: amountCents, quantity: 1 }],
      });
      return r.ok
        ? { ok: true as const, amountCents, qrCode: r.qrCode, transactionId: String(r.transactionId ?? "") }
        : { ok: false as const, error: r.error };
    }

    // primecash
    const secret = process.env.PRIMECASH_SECRET_KEY;
    if (!secret) return { ok: false as const, error: "Configuração do gateway PrimeCash pendente." };
    try {
      const res = await fetch("https://api.primecashbrasil.com/v1/transactions", {
        method: "POST",
        headers: {
          authorization: `Basic ${Buffer.from(`${secret}:x`).toString("base64")}`,
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          amount: amountCents,
          paymentMethod: "pix",
          externalRef,
          customer: {
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            document: { number: customer.cpf, type: "cpf" },
          },
          items: [{ title: productName, unitPrice: amountCents, quantity: 1, tangible: true }],
          pix: { expiresInDays: 1 },
        }),
      });
      const text = await res.text();
      const json: any = (() => { try { return JSON.parse(text); } catch { return null; } })();
      if (!res.ok) return { ok: false as const, error: "Gateway recusou o teste." };
      const qrCode =
        json?.pix?.qrcode || json?.pix?.qrCode || json?.qrcode || json?.qr_code || null;
      if (!qrCode) return { ok: false as const, error: "Gateway não retornou Pix." };
      return {
        ok: true as const,
        amountCents,
        qrCode,
        transactionId: String(json?.id || json?.transactionId || ""),
      };
    } catch {
      return { ok: false as const, error: "Falha ao contatar o gateway." };
    }
  });
