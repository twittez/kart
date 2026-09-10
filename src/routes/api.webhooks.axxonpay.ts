import { createFileRoute } from "@tanstack/react-router";
import { markOrderAsPaid } from "@/utils/primecash.functions";

export const Route = createFileRoute("/api/webhooks/axxonpay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as Record<string, any>;
          console.log("[AxxonPay Webhook Received]:", JSON.stringify(body));

          const eventName = String(body?.event || body?.type || "").toLowerCase().trim();
          const dataStatus = String(
            body?.data?.status || body?.status || body?.transaction?.status || ""
          ).toLowerCase().trim();

          const validPaid = [
            "finished",
            "paid",
            "approved",
            "settled",
            "completed",
            "success",
            "pago",
            "payment.approved",
            "transaction.paid",
            "payment.paid",
          ];

          const isPaid = validPaid.some((s) => eventName.includes(s) || dataStatus.includes(s));

          let parsedMetadata: any = {};
          const rawMeta = body?.data?.metadata || body?.metadata;
          if (typeof rawMeta === "string") {
            try {
              parsedMetadata = JSON.parse(rawMeta);
            } catch {}
          } else if (rawMeta && typeof rawMeta === "object") {
            parsedMetadata = rawMeta;
          }

          const orderId =
            parsedMetadata?.orderId ||
            parsedMetadata?.order_id ||
            parsedMetadata?.trackingReference ||
            body?.data?.orderId ||
            body?.data?.order_id ||
            body?.orderId;
          const transactionId = String(
            body?.data?.id ||
              body?.id ||
              body?.transactionId ||
              body?.data?.externalId ||
              body?.transaction?.id ||
              ""
          ).trim();

          if (isPaid) {
            console.log(`[AxxonPay Webhook] Pagamento APROVADO! Identificadores: orderId=${orderId}, txId=${transactionId}`);
            if (orderId) await markOrderAsPaid(orderId);
            if (transactionId) await markOrderAsPaid(transactionId);
          }

          return new Response(JSON.stringify({ received: true }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          console.error("[AxxonPay Webhook Error]:", err);
          return new Response(JSON.stringify({ error: err?.message }), { status: 500 });
        }
      },
    },
  },
});
