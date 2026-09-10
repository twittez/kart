import { createFileRoute } from "@tanstack/react-router";
import { markOrderAsPaid } from "@/utils/primecash.functions";

export const Route = createFileRoute("/api/webhooks/beehive")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as Record<string, any>;
          console.log("[Beehive Webhook Received]:", JSON.stringify(body));

          const status = String(
            body?.status || body?.data?.status || body?.event || ""
          ).toLowerCase();
          const orderId =
            body?.metadata?.order_id ||
            body?.metadata?.orderId ||
            body?.orderId ||
            body?.order_id;
          const transactionId = String(body?.id || body?.transactionId || body?.data?.id || "");

          const validPaid = [
            "paid",
            "approved",
            "settled",
            "completed",
            "paid_out",
            "success",
            "pago",
          ];

          if (validPaid.some((s) => status.includes(s))) {
            console.log(`[Beehive Webhook] Pagamento APROVADO! Identificadores: orderId=${orderId}, txId=${transactionId}`);
            if (orderId) await markOrderAsPaid(orderId);
            if (transactionId) await markOrderAsPaid(transactionId);
          }

          return new Response(JSON.stringify({ received: true }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          console.error("[Beehive Webhook Error]:", err);
          return new Response(JSON.stringify({ error: err?.message }), { status: 500 });
        }
      },
    },
  },
});
