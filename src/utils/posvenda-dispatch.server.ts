import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendOrderToPosVenda } from "./posvenda.server";

/**
 * Forwards a paid pix_orders row to PósVenda Pro. Idempotent via the
 * `posvenda_sent` flag on the row. Safe to call multiple times.
 */
export async function maybeSendPosVenda(orderId: string): Promise<void> {
  try {
    const { data: order } = await (supabaseAdmin.from("pix_orders") as any)
      .select("*")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return;
    if (order.posvenda_sent) return;
    if (!order.customer_name || !order.customer_email || !order.customer_phone) {
      console.warn("[posvenda] skipping — missing customer data", order.external_ref);
      return;
    }
    const result = await sendOrderToPosVenda({
      orderId: order.external_ref,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      customerEmail: order.customer_email,
      street: order.address_street ?? "",
      number: order.address_number ?? "",
      complement: order.address_complement ?? "",
      neighborhood: order.address_neighborhood ?? "",
      city: order.address_city ?? "",
      state: order.address_state ?? "",
      zipcode: order.address_zipcode ?? "",
      quantity: 1,
      priceInCents: order.amount_cents,
      paymentMethod: (order.payment_method as "pix" | "credit_card" | "boleto") ?? "pix",
    });
    await (supabaseAdmin.from("pix_orders") as any)
      .update({
        posvenda_sent: result.ok,
        posvenda_response: result.ok
          ? { ok: true, response: result.response }
          : { ok: false, error: result.error },
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);
    if (!result.ok) {
      console.warn("[posvenda] send failed", order.external_ref, result.error);
    }
  } catch (e) {
    console.warn("[posvenda] unexpected error", e);
  }
}
