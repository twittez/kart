// Server-only helper for forwarding paid orders to PósVenda Pro.
// The product name sent to PósVenda is ALWAYS "CAR RIDER", regardless of
// the SKU/variant the customer actually bought (per business rule).

export type PosVendaOrderInput = {
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipcode: string;
  quantity?: number;
  priceInCents: number;
  paymentMethod?: "pix" | "credit_card" | "boleto";
};

export type PosVendaResult =
  | { ok: true; response: unknown }
  | { ok: false; error: string };

export async function sendOrderToPosVenda(
  input: PosVendaOrderInput,
): Promise<PosVendaResult> {
  const apiUrl = process.env.POSVENDA_API_URL;
  const token = process.env.POSVENDA_TOKEN;

  if (!apiUrl || !token) {
    return {
      ok: false,
      error:
        "PósVenda Pro não configurado (POSVENDA_API_URL/POSVENDA_TOKEN ausentes)",
    };
  }

  let url: URL;
  try {
    url = new URL(apiUrl);
  } catch {
    return { ok: false, error: "POSVENDA_API_URL inválido" };
  }

  const payload = {
    orderId: input.orderId,
    customer: {
      name: input.customerName,
      phone: (input.customerPhone || "").replace(/\D/g, ""),
      email: input.customerEmail,
    },
    address: {
      street: input.street,
      number: input.number,
      complement: input.complement || "",
      neighborhood: input.neighborhood,
      city: input.city,
      state: (input.state || "").toUpperCase().slice(0, 2),
      zipcode: (input.zipcode || "").replace(/\D/g, ""),
    },
    products: [
      {
        name: "CAR RIDER",
        quantity: input.quantity ?? 1,
        priceInCents: input.priceInCents,
      },
    ],
    paymentMethod: input.paymentMethod ?? "pix",
  };

  try {
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "X-Auth-Token": token,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text().catch(() => "");
    if (!res.ok) {
      return {
        ok: false,
        error: `PósVenda Pro respondeu ${res.status}: ${text.slice(0, 500)}`,
      };
    }
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }
    return { ok: true, response: json };
  } catch (err) {
    return {
      ok: false,
      error: `Falha ao contatar PósVenda Pro: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
}
