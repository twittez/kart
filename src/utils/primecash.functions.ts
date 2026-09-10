import { createServerFn } from "@tanstack/react-start";

export const createPixTransaction = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => data as Record<string, unknown>)
  .handler(async ({ data }) => {
    const { processCreatePix } = await import("@/server/pix.server");
    return await processCreatePix(data as any);
  });

export const createUpsellPixTransaction = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => data as { sessionId?: string; amountCents?: number })
  .handler(async ({ data }) => {
    const { sessionsMap, makeTrackingCode, emergencyPixCode } = await import("@/server/pix.server");
    const { getGatewaySettings } = await import("./gateway-settings.server");
    const { createBeehivePix } = await import("./beehive.server");
    const { createAxxonPix } = await import("./axxon.server");

    const parentSession = data?.sessionId ? sessionsMap.get(data.sessionId) : null;
    const amountCents = data?.amountCents || 9653;
    const upsellSessionId = `upsell_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const trackingCode = parentSession?.trackingCode || makeTrackingCode();

    const gwConfig = await getGatewaySettings().catch(() => ({
      active: "axxon" as const,
      fallback: ["beehive" as const],
    }));

    let qrCode = "";
    let qrImage = "";
    let txId = "";
    let gatewayUsed = gwConfig.active || "axxon";

    const customer = {
      name: parentSession?.customerName || "Cliente Kart",
      email: parentSession?.customerEmail || "cliente@kart.com.br",
      phone: parentSession?.customerPhone || "11999999999",
      cpf: "08852175350",
    };

    if (gatewayUsed === "beehive") {
      const bh = await createBeehivePix({
        amountCents,
        productName: "Acessórios Kart Velox (Capacete + Luva)",
        orderId: upsellSessionId,
        trackingCode,
        customer,
      });
      if (bh.ok && bh.qrCode) {
        qrCode = bh.qrCode;
        qrImage = bh.qrImage || "";
        txId = bh.transactionId || `BH-${Date.now()}`;
      }
    } else {
      const ax = await createAxxonPix({
        amountCents,
        productName: "Acessórios Kart Velox (Capacete + Luva)",
        externalRef: upsellSessionId,
        customer,
        clientIp: null,
        postbackUrl: "https://lojaeranovakt.site/api/webhooks/axxonpay",
      });
      if (ax.ok && ax.qrCode) {
        qrCode = ax.qrCode;
        qrImage = ax.qrImage;
        txId = ax.transactionId;
      }
    }

    if (!qrCode) {
      qrCode = emergencyPixCode(upsellSessionId, amountCents);
      qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrCode)}`;
      txId = `UPS-${Date.now()}`;
    }

    sessionsMap.set(upsellSessionId, {
      sessionId: upsellSessionId,
      orderId: upsellSessionId,
      amountCents,
      trackingCode,
      qrCode,
      qrImage,
      transactionId: txId,
      gateway: gatewayUsed,
      createdAt: Date.now(),
    });

    return { ok: true as const, sessionId: upsellSessionId, error: "" };
  });

export const getCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => data as { sessionId: string })
  .handler(async ({ data }) => {
    const { processGetCheckoutSession } = await import("@/server/pix.server");
    return await processGetCheckoutSession(data.sessionId);
  });

export const getTransactionStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => data as { sessionId: string })
  .handler(async ({ data }) => {
    const { processGetTransactionStatus } = await import("@/server/pix.server");
    return await processGetTransactionStatus(data.sessionId);
  });

export const markPixCopied = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => data as { sessionId: string })
  .handler(async ({ data }) => {
    const { localOrders } = await import("./admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sId = data.sessionId;
    const now = new Date().toISOString();
    const order = localOrders.find((o) => o.external_ref === sId || o.id === sId);
    if (order) order.pix_copied_at = now;

    try {
      await (supabaseAdmin.from("pix_orders") as any)
        .update({ pix_copied_at: now, updated_at: now })
        .or(`external_ref.eq.${sId},id.eq.${sId}`);
    } catch {}

    return { ok: true as const };
  });

export const uploadPaymentProof = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown) => data as { sessionId: string; imageData: string; mimeType?: string }
  )
  .handler(async ({ data }) => {
    try {
      const { saveProof } = await import("./proofs.server");
      const { sessionsMap } = await import("@/server/pix.server");
      const session = sessionsMap.get(data.sessionId);
      await saveProof({
        transactionId: session?.transactionId || data.sessionId,
        imageData: data.imageData,
        mimeType: data.mimeType || "image/jpeg",
      });
      return { ok: true as const, error: "" };
    } catch (e: any) {
      return { ok: false as const, error: e?.message || "Falha ao enviar comprovante" };
    }
  });

export async function markOrderAsPaid(identifier: string): Promise<boolean> {
  const { markOrderAsPaid: mark } = await import("@/server/pix.server");
  return await mark(identifier);
}
