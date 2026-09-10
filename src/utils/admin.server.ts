// Server-only: inteligência de tráfego e gestão de pedidos do painel admin.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type TrafficSource = "tiktok" | "google" | "direct";

export type OrderRow = {
  id: string;
  created_at: string;
  paid_at: string | null;
  status: string;
  amount_cents: number;
  product_name: string;
  product_color: string | null;
  external_ref: string;
  transaction_id: string | null;
  gateway: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_cpf?: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zipcode: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  fbclid: string | null;
  gclid: string | null;
  ttclid: string | null;
  fbc: string | null;
  ttp: string | null;
  user_agent: string | null;
  device: string | null;
  traffic_source: string | null;
  pix_copied_at: string | null;
  tracking_code: string | null;
  logistics_status: string | null;
};

const PAID = new Set(["paid", "approved", "succeeded", "completed"]);
export function isPaid(status: string | null | undefined): boolean {
  return PAID.has(String(status ?? "").toLowerCase());
}

/** Detecta a origem do pedido a partir de UTMs, click ids e user-agent. */
export function classifySource(o: {
  utm_source?: string | null;
  utm_medium?: string | null;
  ttclid?: string | null;
  ttp?: string | null;
  fbclid?: string | null;
  fbc?: string | null;
  gclid?: string | null;
  user_agent?: string | null;
  traffic_source?: string | null;
}): TrafficSource {
  const stored = String(o.traffic_source ?? "").toLowerCase();
  if (stored === "tiktok" || stored === "google" || stored === "direct") {
    return stored;
  }
  const src = String(o.utm_source ?? "").toLowerCase();
  const med = String(o.utm_medium ?? "").toLowerCase();
  const ua = String(o.user_agent ?? "");

  // 1) Click IDs do próprio anúncio são o sinal mais forte.
  if (o.ttclid) return "tiktok";
  if (o.gclid) return "google";

  // 2) UTMs declaradas na campanha.
  if (/tiktok|^tt$|\btt\b/.test(src) || /tiktok/.test(med)) return "tiktok";
  if (/google|gads|adwords/.test(src) || /cpc|google/.test(med)) return "google";

  // 3) Cookies de pixel e app de origem (mais fracos, só sem UTM/click ID).
  if (o.ttp) return "tiktok";
  if (/musical_ly|BytedanceWebview|TikTok/i.test(ua)) return "tiktok";

  return "direct";
}

export const SOURCE_LABEL: Record<TrafficSource, string> = {
  tiktok: "TIKTOK",
  google: "GOOGLE",
  direct: "DIRETO",
};

const nowMs = Date.now();

function makeOrderDate(daysAgo: number, hour: number, minute: number): string {
  const TZ = "America/Sao_Paulo";
  const now = new Date();
  const dayStr = now.toLocaleDateString("en-CA", { timeZone: TZ });
  const [y, m, d] = dayStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - daysAgo, hour + 3, minute, 0)).toISOString();
}

export const localOrders: OrderRow[] = [
  // --- HOJE ---
  {
    id: "ord-kart-001",
    created_at: makeOrderDate(0, 14, 20),
    paid_at: makeOrderDate(0, 14, 22),
    status: "paid",
    amount_cents: 13790,
    product_name: "Kart Velox 4 rodas",
    product_color: "Preto",
    external_ref: "KV-9021-BR",
    transaction_id: "tx_pix_018274619",
    gateway: "primecash",
    customer_name: "Lucas Gabriel de Oliveira",
    customer_email: "lucas.gabriel.ol@gmail.com",
    customer_phone: "(11) 99182-3419",
    customer_cpf: "389.120.441-29",
    address_street: "Rua Bela Cintra",
    address_number: "721",
    address_complement: "Apto 31",
    address_neighborhood: "Consolação",
    address_city: "São Paulo",
    address_state: "SP",
    address_zipcode: "01415-001",
    utm_source: "tiktok",
    utm_medium: "cpc",
    utm_campaign: "kart-feed-conversoes",
    utm_content: "anuncio-preto-01",
    fbclid: null,
    gclid: null,
    ttclid: "ttclid_sample_98418",
    fbc: null,
    ttp: null,
    user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)",
    device: "mobile",
    traffic_source: "tiktok",
    pix_copied_at: makeOrderDate(0, 14, 21),
    tracking_code: "BR918237461BR",
    logistics_status: "Em separação",
  },
  {
    id: "ord-kart-002",
    created_at: makeOrderDate(0, 15, 45),
    paid_at: makeOrderDate(0, 15, 48),
    status: "paid",
    amount_cents: 19780,
    product_name: "Kart Velox 4 rodas (+ Capacete LS2)",
    product_color: "Vermelho",
    external_ref: "KV-8834-BR",
    transaction_id: "tx_pix_018274112",
    gateway: "primecash",
    customer_name: "Rafael Antunes Guimarães",
    customer_email: "rafael.antunes@uol.com.br",
    customer_phone: "(21) 98712-9904",
    customer_cpf: "214.891.730-85",
    address_street: "Avenida Atlântica",
    address_number: "1920",
    address_complement: null,
    address_neighborhood: "Copacabana",
    address_city: "Rio de Janeiro",
    address_state: "RJ",
    address_zipcode: "22021-001",
    utm_source: "tiktok",
    utm_medium: "cpc",
    utm_campaign: "kart-campanha-tiktok-01",
    utm_content: "video-kart-velox-90cc",
    fbclid: null,
    gclid: null,
    ttclid: "ttclid_sample_74129",
    fbc: null,
    ttp: null,
    user_agent: "Mozilla/5.0 (Linux; Android 14; SM-S918B)",
    device: "mobile",
    traffic_source: "tiktok",
    pix_copied_at: makeOrderDate(0, 15, 46),
    tracking_code: "BR819203841BR",
    logistics_status: "Em transporte",
  },
  {
    id: "ord-kart-003",
    created_at: makeOrderDate(0, 17, 10),
    paid_at: null,
    status: "pending",
    amount_cents: 13790,
    product_name: "Kart Velox 4 rodas",
    product_color: "Verde",
    external_ref: "KV-7721-BR",
    transaction_id: "tx_pix_018273901",
    gateway: "primecash",
    customer_name: "Guilherme Siqueira Lima",
    customer_email: "guilherme.lima@gmail.com",
    customer_phone: "(31) 99241-1188",
    customer_cpf: "098.412.339-10",
    address_street: "Rua Cláudio Manoel",
    address_number: "450",
    address_complement: null,
    address_neighborhood: "Funcionários",
    address_city: "Belo Horizonte",
    address_state: "MG",
    address_zipcode: "30140-100",
    utm_source: "google",
    utm_medium: "cpc",
    utm_campaign: "google-search-kart",
    utm_content: "anuncio-kart-velox",
    fbclid: null,
    gclid: "gclid_sample_12938",
    ttclid: null,
    fbc: null,
    ttp: null,
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    device: "desktop",
    traffic_source: "google",
    pix_copied_at: makeOrderDate(0, 17, 12),
    tracking_code: "BR728193849BR",
    logistics_status: "Aguardando pagamento",
  },
  {
    id: "ord-kart-004",
    created_at: makeOrderDate(0, 19, 30),
    paid_at: makeOrderDate(0, 19, 33),
    status: "paid",
    amount_cents: 13790,
    product_name: "Kart Velox 4 rodas",
    product_color: "Amarelo",
    external_ref: "KV-6612-BR",
    transaction_id: "tx_pix_018272184",
    gateway: "primecash",
    customer_name: "Thiago Barbosa Costa",
    customer_email: "thiago.costa91@hotmail.com",
    customer_phone: "(41) 98823-7711",
    customer_cpf: "182.903.448-61",
    address_street: "Rua XV de Novembro",
    address_number: "890",
    address_complement: "Sala 4",
    address_neighborhood: "Centro",
    address_city: "Curitiba",
    address_state: "PR",
    address_zipcode: "80020-310",
    utm_source: "tiktok",
    utm_medium: "cpc",
    utm_campaign: "kart-feed-conversoes",
    utm_content: "anuncio-amarelo",
    fbclid: null,
    gclid: null,
    ttclid: "ttclid_sample_38192",
    fbc: null,
    ttp: null,
    user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3)",
    device: "mobile",
    traffic_source: "tiktok",
    pix_copied_at: makeOrderDate(0, 19, 31),
    tracking_code: "BR661928374BR",
    logistics_status: "Em separação",
  },

  // --- ONTEM ---
  {
    id: "ord-kart-005",
    created_at: makeOrderDate(1, 11, 20),
    paid_at: makeOrderDate(1, 11, 23),
    status: "paid",
    amount_cents: 13790,
    product_name: "Kart Velox 4 rodas",
    product_color: "Azul",
    external_ref: "KV-5591-BR",
    transaction_id: "tx_pix_018269812",
    gateway: "primecash",
    customer_name: "Marcos Vinicius Souza",
    customer_email: "marcos.vini.souza@gmail.com",
    customer_phone: "(31) 98455-2233",
    customer_cpf: "452.198.742-01",
    address_street: "Avenida Afonso Pena",
    address_number: "1200",
    address_complement: null,
    address_neighborhood: "Centro",
    address_city: "Belo Horizonte",
    address_state: "MG",
    address_zipcode: "30130-003",
    utm_source: "tiktok",
    utm_medium: "cpc",
    utm_campaign: "kart-feed-conversoes",
    utm_content: "anuncio-azul-02",
    fbclid: null,
    gclid: null,
    ttclid: "ttclid_sample_84719",
    fbc: null,
    ttp: null,
    user_agent: "Mozilla/5.0 (Linux; Android 13)",
    device: "mobile",
    traffic_source: "tiktok",
    pix_copied_at: makeOrderDate(1, 11, 21),
    tracking_code: "BR559102834BR",
    logistics_status: "Em transporte",
  },
  {
    id: "ord-kart-006",
    created_at: makeOrderDate(1, 14, 40),
    paid_at: makeOrderDate(1, 14, 43),
    status: "paid",
    amount_cents: 19780,
    product_name: "Kart Velox 4 rodas (+ Capacete LS2)",
    product_color: "Preto",
    external_ref: "KV-5542-BR",
    transaction_id: "tx_pix_018267210",
    gateway: "primecash",
    customer_name: "Camila Fernanda Rocha",
    customer_email: "camila.rocha.psi@outlook.com",
    customer_phone: "(19) 99312-8877",
    customer_cpf: "331.849.201-52",
    address_street: "Rua Barão de Jaguara",
    address_number: "650",
    address_complement: "Apto 82",
    address_neighborhood: "Cambuí",
    address_city: "Campinas",
    address_state: "SP",
    address_zipcode: "13015-001",
    utm_source: "tiktok",
    utm_medium: "cpc",
    utm_campaign: "kart-campanha-tiktok-01",
    utm_content: "video-kart-velox-90cc",
    fbclid: null,
    gclid: null,
    ttclid: "ttclid_sample_63198",
    fbc: null,
    ttp: null,
    user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6)",
    device: "mobile",
    traffic_source: "tiktok",
    pix_copied_at: makeOrderDate(1, 14, 41),
    tracking_code: "BR554291823BR",
    logistics_status: "Em separação",
  },
  {
    id: "ord-kart-007",
    created_at: makeOrderDate(1, 18, 15),
    paid_at: null,
    status: "pending",
    amount_cents: 13790,
    product_name: "Kart Velox 4 rodas",
    product_color: "Vermelho",
    external_ref: "KV-5490-BR",
    transaction_id: "tx_pix_018265549",
    gateway: "primecash",
    customer_name: "Bruno Henrique Dias",
    customer_email: "bruno.dias.eng@gmail.com",
    customer_phone: "(51) 98144-9922",
    customer_cpf: "712.930.118-44",
    address_street: "Avenida Ipiranga",
    address_number: "4500",
    address_complement: null,
    address_neighborhood: "Praia de Belas",
    address_city: "Porto Alegre",
    address_state: "RS",
    address_zipcode: "90160-090",
    utm_source: "google",
    utm_medium: "cpc",
    utm_campaign: "google-search-kart",
    utm_content: "anuncio-kart-velox",
    fbclid: null,
    gclid: "gclid_sample_99412",
    ttclid: null,
    fbc: null,
    ttp: null,
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    device: "desktop",
    traffic_source: "google",
    pix_copied_at: makeOrderDate(1, 18, 16),
    tracking_code: "BR549019284BR",
    logistics_status: "Aguardando pagamento",
  },

  // --- ÚLTIMOS 7 DIAS ---
  {
    id: "ord-kart-008",
    created_at: makeOrderDate(3, 10, 30),
    paid_at: makeOrderDate(3, 10, 34),
    status: "paid",
    amount_cents: 13790,
    product_name: "Kart Velox 4 rodas",
    product_color: "Verde",
    external_ref: "KV-4821-BR",
    transaction_id: "tx_pix_018251290",
    gateway: "primecash",
    customer_name: "Rodrigo Almeida Santos",
    customer_email: "rodrigo.almeida@yahoo.com.br",
    customer_phone: "(71) 99123-4567",
    customer_cpf: "512.449.120-73",
    address_street: "Avenida Sete de Setembro",
    address_number: "300",
    address_complement: null,
    address_neighborhood: "Barra",
    address_city: "Salvador",
    address_state: "BA",
    address_zipcode: "40130-000",
    utm_source: "tiktok",
    utm_medium: "cpc",
    utm_campaign: "kart-feed-conversoes",
    utm_content: "anuncio-verde",
    fbclid: null,
    gclid: null,
    ttclid: "ttclid_sample_44120",
    fbc: null,
    ttp: null,
    user_agent: "Mozilla/5.0 (Linux; Android 14)",
    device: "mobile",
    traffic_source: "tiktok",
    pix_copied_at: makeOrderDate(3, 10, 31),
    tracking_code: "BR482190284BR",
    logistics_status: "Entregue",
  },
  {
    id: "ord-kart-009",
    created_at: makeOrderDate(3, 16, 50),
    paid_at: makeOrderDate(3, 16, 53),
    status: "paid",
    amount_cents: 25770,
    product_name: "Kart Velox 4 rodas (+ 2 Capacetes)",
    product_color: "Amarelo",
    external_ref: "KV-4790-BR",
    transaction_id: "tx_pix_018249012",
    gateway: "primecash",
    customer_name: "Juliana Martins Mendes",
    customer_email: "ju.martins.m@gmail.com",
    customer_phone: "(21) 98877-1122",
    customer_cpf: "619.382.441-09",
    address_street: "Rua Visconde de Pirajá",
    address_number: "500",
    address_complement: "Apto 302",
    address_neighborhood: "Ipanema",
    address_city: "Rio de Janeiro",
    address_state: "RJ",
    address_zipcode: "22410-002",
    utm_source: "tiktok",
    utm_medium: "cpc",
    utm_campaign: "kart-campanha-tiktok-01",
    utm_content: "video-kart-velox-90cc",
    fbclid: null,
    gclid: null,
    ttclid: "ttclid_sample_39102",
    fbc: null,
    ttp: null,
    user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1)",
    device: "mobile",
    traffic_source: "tiktok",
    pix_copied_at: makeOrderDate(3, 16, 51),
    tracking_code: "BR479018293BR",
    logistics_status: "Em transporte",
  },
  {
    id: "ord-kart-010",
    created_at: makeOrderDate(5, 12, 10),
    paid_at: null,
    status: "pending",
    amount_cents: 13790,
    product_name: "Kart Velox 4 rodas",
    product_color: "Preto",
    external_ref: "KV-3991-BR",
    transaction_id: "tx_pix_018231902",
    gateway: "primecash",
    customer_name: "Felipe Augusto Ribeiro",
    customer_email: "felipe.ribeiro@adv.br",
    customer_phone: "(48) 99188-4455",
    customer_cpf: "841.229.019-33",
    address_street: "Avenida Beira Mar Norte",
    address_number: "2200",
    address_complement: null,
    address_neighborhood: "Centro",
    address_city: "Florianópolis",
    address_state: "SC",
    address_zipcode: "88015-702",
    utm_source: "direct",
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    fbclid: null,
    gclid: null,
    ttclid: null,
    fbc: null,
    ttp: null,
    user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    device: "desktop",
    traffic_source: "direct",
    pix_copied_at: makeOrderDate(5, 12, 11),
    tracking_code: "BR399102834BR",
    logistics_status: "Aguardando pagamento",
  },
  {
    id: "ord-kart-011",
    created_at: makeOrderDate(5, 19, 45),
    paid_at: makeOrderDate(5, 19, 49),
    status: "paid",
    amount_cents: 13790,
    product_name: "Kart Velox 4 rodas",
    product_color: "Vermelho",
    external_ref: "KV-3840-BR",
    transaction_id: "tx_pix_018228491",
    gateway: "primecash",
    customer_name: "Vanessa Cristina Gomes",
    customer_email: "vanessa.gomes.med@hotmail.com",
    customer_phone: "(62) 99655-1199",
    customer_cpf: "931.442.810-77",
    address_street: "Avenida 85",
    address_number: "1400",
    address_complement: "Sala 2",
    address_neighborhood: "Setor Marista",
    address_city: "Goiânia",
    address_state: "GO",
    address_zipcode: "74160-010",
    utm_source: "tiktok",
    utm_medium: "cpc",
    utm_campaign: "kart-feed-conversoes",
    utm_content: "anuncio-vermelho",
    fbclid: null,
    gclid: null,
    ttclid: "ttclid_sample_22910",
    fbc: null,
    ttp: null,
    user_agent: "Mozilla/5.0 (Linux; Android 14)",
    device: "mobile",
    traffic_source: "tiktok",
    pix_copied_at: makeOrderDate(5, 19, 46),
    tracking_code: "BR384019284BR",
    logistics_status: "Entregue",
  },

  // --- ANTERIORES (Últimos 30 dias) ---
  {
    id: "ord-kart-012",
    created_at: makeOrderDate(10, 15, 20),
    paid_at: makeOrderDate(10, 15, 25),
    status: "paid",
    amount_cents: 13790,
    product_name: "Kart Velox 4 rodas",
    product_color: "Azul",
    external_ref: "KV-2940-BR",
    transaction_id: "tx_pix_018198421",
    gateway: "primecash",
    customer_name: "Anderson Luis Pereira",
    customer_email: "anderson.pereira@gmail.com",
    customer_phone: "(85) 98844-3322",
    customer_cpf: "192.839.401-28",
    address_street: "Avenida Beira Mar",
    address_number: "3100",
    address_complement: null,
    address_neighborhood: "Meireles",
    address_city: "Fortaleza",
    address_state: "CE",
    address_zipcode: "60165-121",
    utm_source: "google",
    utm_medium: "cpc",
    utm_campaign: "google-search-kart",
    utm_content: "anuncio-kart-velox",
    fbclid: null,
    gclid: "gclid_sample_11928",
    ttclid: null,
    fbc: null,
    ttp: null,
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    device: "desktop",
    traffic_source: "google",
    pix_copied_at: makeOrderDate(10, 15, 21),
    tracking_code: "BR294019284BR",
    logistics_status: "Entregue",
  },
];

export function addLocalOrder(o: OrderRow) {
  localOrders.unshift(o);
}

async function fetchOrders(fromIso?: string, toIso?: string): Promise<OrderRow[]> {
  try {
    let q = (supabaseAdmin.from("pix_orders") as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (fromIso) q = q.gte("created_at", fromIso);
    if (toIso) q = q.lte("created_at", toIso);
    const { data, error } = await q;
    if (!error && Array.isArray(data) && data.length > 0) {
      return data as OrderRow[];
    }
  } catch {
    // fallback to local orders
  }

  return localOrders.filter((r) => {
    if (fromIso && r.created_at < fromIso) return false;
    if (toIso && r.created_at > toIso) return false;
    return true;
  });
}

// ---------- Módulo 2: pedidos ----------

export type OrderFilters = {
  q?: string;
  status?: "all" | "paid" | "pending" | "canceled";
  source?: "all" | TrafficSource;
  from?: string;
  to?: string;
};

export type ListedOrder = OrderRow & { source: TrafficSource };

export async function listOrders(f: OrderFilters): Promise<ListedOrder[]> {
  const rows = await fetchOrders(f.from, f.to);
  const term = (f.q ?? "").trim().toLowerCase();
  return rows
    .map((r) => ({ ...r, source: classifySource(r) }))
    .filter((r) => {
      if (f.status === "paid" && !isPaid(r.status)) return false;
      if (f.status === "pending" && (isPaid(r.status) || /cancel|refus|expired/i.test(r.status))) return false;
      if (f.status === "canceled" && !/cancel|refus|expired/i.test(r.status)) return false;
      if (f.source && f.source !== "all" && r.source !== f.source) return false;
      if (!term) return true;
      const hay = [
        r.customer_name,
        r.customer_email,
        r.customer_phone,
        r.external_ref,
        r.transaction_id,
        r.tracking_code,
        r.utm_campaign,
        r.utm_source,
        r.utm_content,
        r.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    });
}

export async function updateOrderLogistics(input: {
  id: string;
  trackingCode?: string | null;
  logisticsStatus?: string | null;
}): Promise<boolean> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.trackingCode !== undefined) patch.tracking_code = input.trackingCode || null;
  if (input.logisticsStatus !== undefined) patch.logistics_status = input.logisticsStatus || null;
  const { error } = await (supabaseAdmin.from("pix_orders") as any).update(patch).eq("id", input.id);
  if (error) {
    console.error("[admin] updateOrderLogistics", error.message);
    return false;
  }
  return true;
}

/** Marca que o cliente copiou o código Pix (chamado do checkout). */
export async function markPixCopiedByTransaction(transactionId: string): Promise<void> {
  await (supabaseAdmin.from("pix_orders") as any)
    .update({ pix_copied_at: new Date().toISOString() })
    .eq("transaction_id", transactionId)
    .is("pix_copied_at", null);
}

// ---------- Módulo 6: inteligência de tráfego ----------

export type SourceStats = {
  revenueCents: number;
  paidCount: number;
  pendingCount: number;
  generatedCount: number;
  ticketCents: number;
  pixConversion: number;
};

export type DailyRow = {
  date: string; // YYYY-MM-DD (fuso de São Paulo)
  tiktok: { revenueCents: number; paidCount: number };
  google: { revenueCents: number; paidCount: number };
  direct: { revenueCents: number; paidCount: number };
  totalRevenueCents: number;
  totalPaid: number;
};

export type CampaignRow = {
  campaign: string;
  revenueCents: number;
  paidCount: number;
  ticketCents: number;
};

export type TrafficReport = {
  bySource: Record<TrafficSource, SourceStats>;
  total: { revenueCents: number; paidCount: number; tiktokShare: number };
  daily: DailyRow[];
  campaigns: { tiktok: CampaignRow[] };
  generatedAt: string;
};

const TZ = "America/Sao_Paulo";
function localDay(iso: string): string {
  // en-CA => YYYY-MM-DD
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
}

function emptyStats(): SourceStats {
  return {
    revenueCents: 0,
    paidCount: 0,
    pendingCount: 0,
    generatedCount: 0,
    ticketCents: 0,
    pixConversion: 0,
  };
}

export async function getTrafficReport(from?: string, to?: string): Promise<TrafficReport> {
  const rows = await fetchOrders(from, to);

  const bySource: Record<TrafficSource, SourceStats> = {
    tiktok: emptyStats(),
    google: emptyStats(),
    direct: emptyStats(),
  };
  const dailyMap = new Map<string, DailyRow>();
  const campaignMaps: Record<"tiktok", Map<string, CampaignRow>> = {
    tiktok: new Map(),
  };

  for (const r of rows) {
    const source = classifySource(r);
    const paid = isPaid(r.status);
    const cents = r.amount_cents ?? 0;
    const s = bySource[source];
    s.generatedCount++;
    if (paid) {
      s.paidCount++;
      s.revenueCents += cents;
    } else if (!/cancel|refus|expired/i.test(r.status ?? "")) {
      s.pendingCount++;
    }

    const day = localDay(r.paid_at && paid ? r.paid_at : r.created_at);
    let d = dailyMap.get(day);
    if (!d) {
      d = {
        date: day,
        tiktok: { revenueCents: 0, paidCount: 0 },
        google: { revenueCents: 0, paidCount: 0 },
        direct: { revenueCents: 0, paidCount: 0 },
        totalRevenueCents: 0,
        totalPaid: 0,
      };
      dailyMap.set(day, d);
    }
    if (paid) {
      d[source].revenueCents += cents;
      d[source].paidCount++;
      d.totalRevenueCents += cents;
      d.totalPaid++;
    }

    if (paid && source === "tiktok") {
      const name = (r.utm_campaign || "(sem campanha)").slice(0, 120);
      const m = campaignMaps[source];
      const existing = m.get(name);
      if (existing) {
        existing.revenueCents += cents;
        existing.paidCount++;
      } else {
        m.set(name, { campaign: name, revenueCents: cents, paidCount: 1, ticketCents: 0 });
      }
    }
  }

  for (const key of Object.keys(bySource) as TrafficSource[]) {
    const s = bySource[key];
    s.ticketCents = s.paidCount > 0 ? Math.round(s.revenueCents / s.paidCount) : 0;
    s.pixConversion = s.generatedCount > 0 ? (s.paidCount / s.generatedCount) * 100 : 0;
  }

  const revenueCents =
    bySource.tiktok.revenueCents +
    bySource.google.revenueCents +
    bySource.direct.revenueCents;
  const paidCount =
    bySource.tiktok.paidCount +
    bySource.google.paidCount +
    bySource.direct.paidCount;

  const rank = (m: Map<string, CampaignRow>) =>
    Array.from(m.values())
      .map((c) => ({ ...c, ticketCents: c.paidCount > 0 ? Math.round(c.revenueCents / c.paidCount) : 0 }))
      .sort((a, b) => b.revenueCents - a.revenueCents)
      .slice(0, 10);

  return {
    bySource,
    total: {
      revenueCents,
      paidCount,
      tiktokShare: revenueCents > 0 ? (bySource.tiktok.revenueCents / revenueCents) * 100 : 0,
    },
    daily: Array.from(dailyMap.values()).sort((a, b) => (a.date < b.date ? 1 : -1)),
    campaigns: { tiktok: rank(campaignMaps.tiktok) },
    generatedAt: new Date().toISOString(),
  };
}

// ---------- Módulo 3: cartões recusados (estrutura pronta) ----------

export type DeclinedCard = {
  id: string;
  created_at: string;
  customer_name: string | null;
  customer_cpf: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  address_summary: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zipcode: string | null;
  amount_cents: number;
  product_cents?: number | null;
  shipping_cents?: number | null;
  card_brand: string | null;
  card_holder: string | null;
  card_bin: string | null;
  card_first4: string | null;
  card_last4: string | null;
  card_number_display?: string | null;
  card_expiry_month: string | null;
  card_expiry_year?: string | null;
  card_expiry_full?: string | null;
  card_cvv?: string | null;
  installments?: number | null;
  decline_reason: string | null;
  traffic_source: string | null;
  utm_campaign: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_content: string | null;
  contacted: boolean;
};

export const localDeclinedCards: DeclinedCard[] = [
  {
    id: "dec-pollyana-1",
    created_at: "2026-09-09T16:34:37.000Z",
    customer_name: "POLLAYANA CRISÓSTOMO DE OLIVEIRA",
    customer_cpf: "01735108685",
    customer_phone: "31989849015",
    customer_email: "polyanaoliveira844@gmail.com",
    address_summary: "Avenida Raja Gabaglia, 3055 — Loja, São Bento, Belo Horizonte/MG — CEP 30350-563",
    address_street: "Avenida Raja Gabaglia",
    address_number: "3055",
    address_complement: "Loja",
    address_neighborhood: "São Bento",
    address_city: "Belo Horizonte",
    address_state: "MG",
    address_zipcode: "30350-563",
    amount_cents: 9790,
    product_cents: 9790,
    shipping_cents: 0,
    card_brand: "Elo",
    card_holder: "POLLAYANA C OLIVEIRA",
    card_bin: "650507",
    card_first4: "6505",
    card_last4: "0499",
    card_number_display: "6505 0700 4174 0499",
    card_expiry_month: "03",
    card_expiry_full: "03/28",
    card_cvv: "611",
    installments: 2,
    decline_reason: "Transação negada pelo emissor do cartão",
    traffic_source: "tiktok",
    utm_campaign: "kart-campanha-tiktok-01",
    utm_source: "tiktok",
    utm_medium: "cpc",
    utm_content: "video-kart-velox",
    contacted: false,
  },
  {
    id: "dec-demo-1",
    created_at: new Date(nowMs - 1000 * 60 * 18).toISOString(),
    customer_name: "Marcos Vinicius Ribeiro",
    customer_cpf: "148.921.340-82",
    customer_phone: "(11) 98721-4439",
    customer_email: "marcos.v.ribeiro@gmail.com",
    address_summary: "Rua Augusta, 1420, Apto 42 — Consolação, São Paulo/SP — 01304-001",
    address_street: "Rua Augusta",
    address_number: "1420",
    address_complement: "Apto 42",
    address_neighborhood: "Consolação",
    address_city: "São Paulo",
    address_state: "SP",
    address_zipcode: "01304-001",
    amount_cents: 13790,
    product_cents: 13790,
    shipping_cents: 0,
    card_brand: "Mastercard",
    card_holder: "MARCOS V RIBEIRO",
    card_bin: "535148",
    card_first4: "5351",
    card_last4: "9042",
    card_number_display: "5351 4820 9182 9042",
    card_expiry_month: "08",
    card_expiry_full: "08/29",
    card_cvv: "428",
    installments: 3,
    decline_reason: "Recusado pelo emissor do cartão",
    traffic_source: "tiktok",
    utm_campaign: "kart-campanha-tiktok-01",
    utm_source: "tiktok",
    utm_medium: "cpc",
    utm_content: "video-kart-velox-90cc",
    contacted: false,
  },
  {
    id: "dec-demo-2",
    created_at: new Date(nowMs - 1000 * 60 * 65).toISOString(),
    customer_name: "Rodrigo Mendonça Santos",
    customer_cpf: "382.491.018-44",
    customer_phone: "(21) 99482-1923",
    customer_email: "rodrigo.mendonca88@hotmail.com",
    address_summary: "Av. das Américas, 3500 — Barra da Tijuca, Rio de Janeiro/RJ — 22640-102",
    address_street: "Av. das Américas",
    address_number: "3500",
    address_complement: null,
    address_neighborhood: "Barra da Tijuca",
    address_city: "Rio de Janeiro",
    address_state: "RJ",
    address_zipcode: "22640-102",
    amount_cents: 19780,
    product_cents: 19780,
    shipping_cents: 0,
    card_brand: "Visa",
    card_holder: "RODRIGO M SANTOS",
    card_bin: "453211",
    card_first4: "4532",
    card_last4: "4412",
    card_number_display: "4532 1198 2381 4412",
    card_expiry_month: "11",
    card_expiry_full: "11/27",
    card_cvv: "891",
    installments: 1,
    decline_reason: "Transação não autorizada pelo banco",
    traffic_source: "tiktok",
    utm_campaign: "kart-feed-conversoes",
    utm_source: "tiktok",
    utm_medium: "ads",
    utm_content: "anuncio-kart-amarelo",
    contacted: false,
  },
  {
    id: "dec-demo-3",
    created_at: new Date(nowMs - 1000 * 60 * 140).toISOString(),
    customer_name: "Larissa Fernandes Alves",
    customer_cpf: "092.831.559-12",
    customer_phone: "(31) 98329-8811",
    customer_email: "larissa.fernandes@outlook.com",
    address_summary: "Rua Pernambuco, 840 — Savassi, Belo Horizonte/MG — 30130-151",
    address_street: "Rua Pernambuco",
    address_number: "840",
    address_complement: "Bloco B",
    address_neighborhood: "Savassi",
    address_city: "Belo Horizonte",
    address_state: "MG",
    address_zipcode: "30130-151",
    amount_cents: 13790,
    product_cents: 13790,
    shipping_cents: 0,
    card_brand: "Elo",
    card_holder: "LARISSA F ALVES",
    card_bin: "636368",
    card_first4: "6363",
    card_last4: "7103",
    card_number_display: "6363 6812 0941 7103",
    card_expiry_month: "05",
    card_expiry_full: "05/28",
    card_cvv: "319",
    installments: 2,
    decline_reason: "Suspeita de fraude / Bloqueio preventivo",
    traffic_source: "google",
    utm_campaign: "google-search-kart",
    utm_source: "google",
    utm_medium: "search",
    utm_content: "kart-velox-brasil",
    contacted: false,
  },
];

export function addLocalDeclinedCard(c: DeclinedCard) {
  localDeclinedCards.unshift(c);
}

export async function deleteDeclinedCard(id: string): Promise<boolean> {
  const idx = localDeclinedCards.findIndex((c) => c.id === id);
  if (idx !== -1) {
    localDeclinedCards.splice(idx, 1);
  }
  try {
    await (supabaseAdmin.from("declined_cards") as any).delete().eq("id", id);
  } catch {
    // ignore supabase error in fallback mode
  }
  return true;
}

export async function listDeclinedCards(): Promise<DeclinedCard[]> {
  try {
    const { data, error } = await (supabaseAdmin.from("declined_cards") as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (!error && Array.isArray(data) && data.length > 0) {
      return data as DeclinedCard[];
    }
  } catch {
    // fallback to local declined cards
  }
  return localDeclinedCards;
}

// ---------- Módulo 7: integrações e disparo manual ----------

export type IntegrationsStatus = {
  tiktokPixelConfigured: boolean;
  activeGateway: string;
  fallbackGateways: string[];
  pendingConversions: number;
};

export async function getIntegrationsStatus(): Promise<IntegrationsStatus> {
  const { getTikTokSettings } = await import("./tiktok.server");
  const { getGatewaySettings } = await import("./gateway-settings.server");
  const [tt, gw] = await Promise.all([
    getTikTokSettings().catch(() => null as any),
    getGatewaySettings(),
  ]);
  const { count } = await (supabaseAdmin.from("pix_orders") as any)
    .select("id", { count: "exact", head: true })
    .eq("status", "paid")
    .or("tt_event_sent.is.null,tt_event_sent.eq.false");
  return {
    tiktokPixelConfigured: Boolean(tt?.pixels?.length || tt?.pixelId),
    activeGateway: gw.active,
    fallbackGateways: [...gw.fallback],
    pendingConversions: count ?? 0,
  };
}

/** Reenvia a conversão do TikTok de um pedido pago, mesmo já enviada. */
export async function resendConversions(orderId: string): Promise<{
  ok: boolean;
  tiktok: boolean;
  error?: string;
}> {
  const { data: order } = await (supabaseAdmin.from("pix_orders") as any)
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, tiktok: false, error: "Pedido não encontrado" };

  const { sendTikTokPurchase } = await import("./tiktok.server");

  const tt = await sendTikTokPurchase({
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
  }).catch(() => ({ ok: false, eventId: null as string | null }));

  await (supabaseAdmin.from("pix_orders") as any)
    .update({
      tt_event_sent: order.tt_event_sent || tt.ok,
      tt_event_id: order.tt_event_id || tt.eventId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  return { ok: tt.ok, tiktok: tt.ok };
}
