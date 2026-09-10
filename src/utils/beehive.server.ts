// ---- Beehive Gateway Integration (Idêntico ao projeto Miracle) ----
// Docs: https://api.conta.paybeehive.com.br
// Endpoint de criação: POST /v1/transactions
// Endpoint de status: GET /v1/transactions/:id

export const DEFAULT_BEEHIVE_SECRET_KEY = process.env.BEEHIVE_SECRET_KEY || "";
export const DEFAULT_BEEHIVE_PUBLIC_KEY = process.env.BEEHIVE_PUBLIC_KEY || "";

const BEEHIVE_API_BASE = "https://api.conta.paybeehive.com.br";

export type BeehiveCustomer = {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  address?: {
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    cep?: string;
  };
};

export type CreateBeehivePixInput = {
  amountCents: number;
  productName: string;
  orderId: string;
  trackingCode?: string;
  customer: BeehiveCustomer;
  postbackUrl?: string;
  utm?: Record<string, unknown>;
};

export type PixResult = {
  ok: boolean;
  gateway: "beehive" | "axxon" | "winner" | "primecash";
  transactionId?: string;
  qrCode?: string;
  qrImage?: string;
  error?: string;
  raw?: unknown;
};

function authHeader(secretKey: string): string {
  const credentials = `${secretKey.trim()}:x`;
  return `Basic ${Buffer.from(credentials).toString("base64")}`;
}

export async function createBeehivePix(
  input: CreateBeehivePixInput,
  overrideSecretKey?: string
): Promise<PixResult> {
  const secretKey = overrideSecretKey || DEFAULT_BEEHIVE_SECRET_KEY;
  if (!secretKey || secretKey.includes("placeholder")) {
    return { ok: false, gateway: "beehive", error: "Chave da Beehive não configurada." };
  }

  const cleanPhone = input.customer.phone.replace(/\D/g, "");
  const cleanCpf = input.customer.cpf.replace(/\D/g, "");

  const payload: Record<string, unknown> = {
    amount: input.amountCents,
    paymentMethod: "pix",
    customer: {
      name: input.customer.name,
      email: input.customer.email,
      phone: cleanPhone.length >= 10 ? cleanPhone : "11999999999",
      document: {
        type: "cpf",
        number: cleanCpf || "08852175350",
      },
    },
    items: [
      {
        title: input.productName || "Kart Velox 4 rodas",
        unitPrice: input.amountCents,
        quantity: 1,
        tangible: true,
      },
    ],
    metadata: {
      provider: "kart",
      order_id: input.orderId,
      trackingReference: input.trackingCode || input.orderId,
      ...(input.utm || {}),
    },
    postbackUrl: input.postbackUrl || "https://lojaeranovakt.site/api/webhooks/beehive",
    pix: {
      expiresInSeconds: 1800,
    },
  };

  if (input.customer.address?.street) {
    (payload.customer as any).address = {
      street: input.customer.address.street,
      streetNumber: input.customer.address.number || "SN",
      neighborhood: input.customer.address.neighborhood || "Centro",
      city: input.customer.address.city || "São Paulo",
      state: (input.customer.address.state || "SP").toUpperCase().slice(0, 2),
      zipCode: (input.customer.address.cep || "01310100").replace(/\D/g, ""),
    };
  }

  try {
    const res = await fetch(`${BEEHIVE_API_BASE}/v1/transactions`, {
      method: "POST",
      headers: {
        Authorization: authHeader(secretKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      console.error(`[Beehive Error] Status ${res.status}:`, text);
      return {
        ok: false,
        gateway: "beehive",
        error: data.message || data.error || "Falha ao gerar Pix via Beehive",
        raw: data,
      };
    }

    const bhData = data.data || data;
    const copyPaste =
      bhData.pix?.qrcode ||
      bhData.pix?.qrCode ||
      bhData.pix?.copyPaste ||
      bhData.qrcode ||
      bhData.copyPaste ||
      bhData.emv ||
      "";

    if (!copyPaste) {
      console.error("[Beehive Warning] Resposta sem copyPaste:", bhData);
      return {
        ok: false,
        gateway: "beehive",
        error: "Código Pix não retornado pela Beehive.",
        raw: data,
      };
    }

    const qrImage =
      bhData.pix?.qrCodeUrl ||
      bhData.pix?.imagemQrcode ||
      `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(copyPaste)}`;

    const transactionId = String(bhData.id || `BH-${Date.now()}`);

    return {
      ok: true,
      gateway: "beehive",
      transactionId,
      qrCode: copyPaste,
      qrImage,
      raw: data,
    };
  } catch (err: any) {
    console.error("[Beehive Exception]:", err);
    return {
      ok: false,
      gateway: "beehive",
      error: `Erro de conexão com Beehive: ${err?.message || err}`,
    };
  }
}

export async function getBeehivePaymentStatus(
  transactionId: string,
  overrideSecretKey?: string
): Promise<{ ok: boolean; status: string; raw?: unknown }> {
  const secretKey = overrideSecretKey || DEFAULT_BEEHIVE_SECRET_KEY;
  if (!secretKey || !transactionId) {
    return { ok: false, status: "pending" };
  }

  try {
    const res = await fetch(`${BEEHIVE_API_BASE}/v1/transactions/${transactionId}`, {
      method: "GET",
      headers: {
        Authorization: authHeader(secretKey),
      },
    });

    if (!res.ok) {
      return { ok: false, status: "pending" };
    }

    const data = await res.json();
    const bhData = data.data || data;
    const rawStatus = String(bhData.status || bhData.paymentStatus || "").toLowerCase().trim();

    const validPaid = [
      "paid",
      "approved",
      "settled",
      "completed",
      "paid_out",
      "success",
      "pago",
    ];

    if (validPaid.includes(rawStatus)) {
      return { ok: true, status: "paid", raw: data };
    }

    if (["refused", "failed", "denied", "canceled", "cancelled", "expired"].includes(rawStatus)) {
      return { ok: true, status: rawStatus, raw: data };
    }

    return { ok: true, status: "pending", raw: data };
  } catch (err: any) {
    console.error("[Beehive Status Check Error]:", err?.message || err);
    return { ok: false, status: "pending" };
  }
}
