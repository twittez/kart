import { z } from "zod";

const winnerInputSchema = z.object({
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
    address: z.object({
      street: z.string(),
      streetNumber: z.string(),
      complement: z.string().nullable(),
      zipCode: z.string(),
      neighborhood: z.string(),
      city: z.string(),
      state: z.string(),
      country: z.string(),
    }),
  }),
  items: z.array(z.object({
    title: z.string(),
    unitPrice: z.number(),
    quantity: z.number(),
  })),
});

const WINNER_BASE_URL = "https://api.winnerpayy.com.br/api";

export async function createWinnerPix(input: z.infer<typeof winnerInputSchema>) {
  const clientSecret = process.env.WINNERPAY_CLIENT_SECRET ?? process.env.WINNER_CLIENT_SECRET;
  const clientId = process.env.WINNERPAY_CLIENT_ID ?? process.env.WINNER_CLIENT_ID;

  if (!clientSecret || !clientId) {
    console.error("Winner gateway keys not configured");
    return { ok: false as const, error: "Configuração do gateway Winner pendente." };
  }

  try {
    const payload: Record<string, unknown> = {
      amount: Number((input.amountCents / 100).toFixed(2)),
      description: input.productName,
      product_name: input.productName,
      external_id: input.externalRef,
      metadata: {
        order_id: input.externalRef,
        product: { name: input.productName },
      },
      customer: {
        name: input.customer.name,
        email: input.customer.email,
        phone: input.customer.phone,
        document: { type: "CPF", number: input.customer.cpf.replace(/\D/g, "") },
        address: {
          street: input.customer.address.street,
          number: input.customer.address.streetNumber,
          complement: input.customer.address.complement ?? "",
          zipcode: input.customer.address.zipCode.replace(/\D/g, ""),
          neighborhood: input.customer.address.neighborhood,
          city: input.customer.address.city,
          state: input.customer.address.state,
          country: input.customer.address.country,
        },
      },
      items: input.items.map((i) => ({
        title: i.title,
        unit_price: Number((i.unitPrice / 100).toFixed(2)),
        quantity: i.quantity,
      })),
    };

    if (input.postbackUrl) payload.postbackUrl = input.postbackUrl;

    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const res = await fetch(`${WINNER_BASE_URL}/financial/receber-pix`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basic}`,
        "X-Client-Id": clientId,
        "X-Client-Secret": clientSecret,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const raw = await res.text();

    if (!res.ok) {
      console.error("Winner PIX error:", res.status, raw);
      return { ok: false as const, error: "Não foi possível processar o pagamento. Tente novamente." };
    }

    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      console.error("Winner invalid response body");
      return { ok: false as const, error: "Não foi possível processar o pagamento. Tente novamente." };
    }

    const qrCode =
      data?.pix_copia_e_cola ||
      data?.qr_code_data ||
      data?.pix?.copia_e_cola ||
      data?.transaction?.pix_copia_e_cola ||
      null;

    const qrImage =
      data?.qr_code_base64 ||
      data?.qr_code_image ||
      data?.qr_code_url ||
      data?.pix?.qr_code_image ||
      null;

    const transactionId = String(
      data?.transaction?.transaction_id || data?.transaction_id || data?.transaction?.id || ""
    );

    if (!qrCode) {
      console.error("Winner: missing pix payload", raw.slice(0, 500));
      return { ok: false as const, error: "Não foi possível processar o pagamento. Tente novamente." };
    }

    return { ok: true as const, qrCode, qrImage, transactionId };
  } catch (err) {
    console.error("Winner request failed:", err);
    return { ok: false as const, error: "Não foi possível processar o pagamento. Tente novamente." };
  }
}

export async function getWinnerTransactionStatus(transactionId: string) {
  const clientSecret = process.env.WINNERPAY_CLIENT_SECRET ?? process.env.WINNER_CLIENT_SECRET;
  const clientId = process.env.WINNERPAY_CLIENT_ID ?? process.env.WINNER_CLIENT_ID;
  if (!clientSecret || !clientId) {
    return { ok: false as const, error: "Pagamento indisponível no momento. Tente novamente." };
  }
  try {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch(`${WINNER_BASE_URL}/financial/transactions?per_page=50`, {
      headers: {
        Authorization: `Basic ${basic}`,
        "X-Client-Id": clientId,
        "X-Client-Secret": clientSecret,
        accept: "application/json",
      },
    });
    const raw = await res.text();
    if (!res.ok) {
      console.error("Winner status error:", res.status, raw);
      return { ok: false as const, error: "Pagamento indisponível no momento. Tente novamente." };
    }
    const json: any = JSON.parse(raw);
    const list: any[] = json?.transactions?.data || json?.data?.data || json?.data || [];
    const tx = list.find(
      (t) => String(t.transaction_id) === String(transactionId) || String(t.id) === String(transactionId)
    );
    if (!tx) return { ok: true as const, status: "pending", paidAt: null };
    return {
      ok: true as const,
      status: String(tx.status || "pending").toLowerCase(),
      paidAt: tx.paid_at || (String(tx.status).toLowerCase() === "paid" ? tx.updated_at : null) || null,
    };
  } catch (err) {
    console.error("Winner status request failed:", err);
    return { ok: false as const, error: "Pagamento indisponível no momento. Tente novamente." };
  }
}
