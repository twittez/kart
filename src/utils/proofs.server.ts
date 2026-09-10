// Server-only: comprovantes de pagamento enviados pelo cliente.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendTikTokPurchase } from "./tiktok.server";
import { maybeSendPosVenda } from "./posvenda-dispatch.server";

export type PaymentProof = {
  id: string;
  order_id: string | null;
  transaction_id: string | null;
  external_ref: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  amount_cents: number | null;
  image_data: string;
  mime_type: string | null;
  status: string;
  note: string | null;
  reviewed_at: string | null;
  created_at: string;
};

/** Guarda o comprovante enviado no checkout, vinculado ao pedido pela transação. */
export async function saveProof(opts: {
  transactionId: string | null;
  imageData: string;
  mimeType: string | null;
}): Promise<{ ok: boolean }> {
  let order: any = null;
  if (opts.transactionId) {
    const { data } = await (supabaseAdmin.from("pix_orders") as any)
      .select("id, external_ref, customer_name, customer_phone, amount_cents")
      .eq("transaction_id", opts.transactionId)
      .maybeSingle();
    order = data ?? null;
  }
  const { error } = await (supabaseAdmin.from("payment_proofs") as any).insert({
    order_id: order?.id ?? null,
    transaction_id: opts.transactionId,
    external_ref: order?.external_ref ?? null,
    customer_name: order?.customer_name ?? null,
    customer_phone: order?.customer_phone ?? null,
    amount_cents: order?.amount_cents ?? null,
    image_data: opts.imageData,
    mime_type: opts.mimeType,
    status: "pending",
  });
  if (error) {
    console.error("[proofs] insert failed", error.message);
    return { ok: false };
  }
  return { ok: true };
}

export async function listProofs(status: "all" | "pending" | "approved" | "rejected") {
  let q = (supabaseAdmin.from("payment_proofs") as any)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) {
    console.error("[proofs] list failed", error.message);
    return [] as PaymentProof[];
  }
  return (data ?? []) as PaymentProof[];
}

export async function rejectProof(proofId: string, note?: string) {
  await (supabaseAdmin.from("payment_proofs") as any)
    .update({ status: "rejected", note: note ?? null, reviewed_at: new Date().toISOString() })
    .eq("id", proofId);
  return { ok: true as const };
}

/**
 * Aprova o comprovante: marca o pedido como pago e dispara as conversões
 * (TikTok Events API) de forma idempotente.
 */
export async function approveProof(proofId: string) {
  const { data: proof } = await (supabaseAdmin.from("payment_proofs") as any)
    .select("*")
    .eq("id", proofId)
    .maybeSingle();
  if (!proof) return { ok: false as const, error: "Comprovante não encontrado" };

  const nowIso = new Date().toISOString();
  let order: any = null;
  if (proof.order_id) {
    const { data } = await (supabaseAdmin.from("pix_orders") as any)
      .select("*")
      .eq("id", proof.order_id)
      .maybeSingle();
    order = data ?? null;
  }

  await (supabaseAdmin.from("payment_proofs") as any)
    .update({ status: "approved", reviewed_at: nowIso })
    .eq("id", proofId);

  if (!order) return { ok: true as const, converted: false };

  const alreadyPaid = String(order.status).toLowerCase() === "paid";
  const ttResult = order.tt_event_sent
    ? { ok: true, eventId: order.tt_event_id as string | null }
    : await sendTikTokPurchase({
        amountCents: order.amount_cents,
        currency: order.currency || "BRL",
        externalRef: order.external_ref,
        productName: order.product_name,
        emailHash: order.email_hash,
        phoneHash: order.phone_hash,
        clientIp: order.client_ip,
        userAgent: order.user_agent,
        ttclid: order.ttclid,
        ttp: order.ttp,
        pageUrl: order.page_url,
        eventId: order.external_ref,
      });

  await (supabaseAdmin.from("pix_orders") as any)
    .update({
      status: "paid",
      paid_at: order.paid_at || nowIso,
      tt_event_sent: order.tt_event_sent || ttResult.ok,
      tt_event_id: order.tt_event_id || ttResult.eventId,
      updated_at: nowIso,
    })
    .eq("id", order.id);

  await maybeSendPosVenda(order.id).catch(() => {});

  return { ok: true as const, converted: !alreadyPaid && ttResult.ok };
}
