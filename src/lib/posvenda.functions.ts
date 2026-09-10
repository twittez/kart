import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sendOrderToPosVenda } from "@/utils/posvenda.server";

const PosVendaOrderSchema = z.object({
  orderId: z.string().min(1),
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  customerEmail: z.string().email(),
  street: z.string().min(1),
  number: z.string().min(1),
  complement: z.string().optional(),
  neighborhood: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(2).max(2),
  zipcode: z.string().min(8).max(9),
  quantity: z.number().int().min(1).default(1),
  priceInCents: z.number().int().min(0).default(9900),
  paymentMethod: z.enum(["pix", "credit_card", "boleto"]).default("pix"),
});

export const sendToPosVenda = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => PosVendaOrderSchema.parse(data))
  .handler(async ({ data }) => {
    const result = await sendOrderToPosVenda(data);
    if (!result.ok) throw new Error(result.error);
    return { ok: true as const };
  });
