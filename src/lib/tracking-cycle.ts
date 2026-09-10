/**
 * Ciclo logístico do rastreio (puro, sem dependências de servidor).
 *
 * Regra do ciclo, contada em DIAS ÚTEIS a partir da confirmação do pagamento:
 *  - D0            → pedido confirmado + em separação
 *  - a partir de D1 → em transporte
 *  - D1 até D(1+N)  → em transporte, com N entre 8 e 12 dias úteis
 *  - D(1+N)        → entregue ao vizinho (fim do ciclo)
 *
 * O código de rastreio é gerado quando o PIX é criado, mas o ciclo só começa
 * a contar depois que o pagamento é confirmado (paid_at).
 */

export type TrackingPhase =
  | "aguardando_pagamento"
  | "separacao"
  | "em_transporte"
  | "entregue";

export type CycleEvent = {
  date: string;
  status: string;
  location: string;
  description: string;
};

const SEPARATION_BUSINESS_DAYS = 1;
const TRANSIT_MIN_BUSINESS_DAYS = 8;
const TRANSIT_MAX_BUSINESS_DAYS = 12;

/** Código aleatório no formato BR000000000BR. */
export function generateTrackingCode(): string {
  let digits = "";
  for (let i = 0; i < 9; i++) digits += Math.floor(Math.random() * 10);
  return `BR${digits}BR`;
}

/** Hash estável (FNV-1a) usado para escolher a duração do transporte. */
export function stableHash(input: string): number {
  let h = 0x811c9dc5 >>> 0;
  const s = (input || "").trim().toLowerCase();
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h;
}

/** Duração do transporte (8 a 12 dias úteis), fixa por código. */
export function transitBusinessDays(code: string): number {
  const span = TRANSIT_MAX_BUSINESS_DAYS - TRANSIT_MIN_BUSINESS_DAYS + 1;
  return TRANSIT_MIN_BUSINESS_DAYS + (stableHash(code) % span);
}

function isBusinessDay(d: Date): boolean {
  const day = d.getUTCDay();
  return day !== 0 && day !== 6;
}

/** Soma dias úteis a uma data, preservando o horário. */
export function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from.getTime());
  let left = Math.max(0, Math.round(days));
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (isBusinessDay(d)) left--;
  }
  return d;
}

/** Dias úteis inteiros já transcorridos entre duas datas. */
export function businessDaysElapsed(from: Date, to: Date): number {
  if (to.getTime() <= from.getTime()) return 0;
  let count = 0;
  const cursor = new Date(from.getTime());
  while (true) {
    const next = addBusinessDays(cursor, 1);
    if (next.getTime() > to.getTime()) break;
    count++;
    cursor.setTime(next.getTime());
  }
  return count;
}

const TRANSIT_STOPS = [
  {
    status: "Objeto postado",
    location: "Agência de postagem — São Paulo/SP",
    description: "Objeto postado e coletado pela transportadora.",
  },
  {
    status: "Em transporte",
    location: "Centro de triagem — Campinas/SP",
    description: "Objeto recebido no centro de triagem.",
  },
  {
    status: "Em transporte",
    location: "Centro de distribuição — Belo Horizonte/MG",
    description: "Objeto em trânsito entre unidades.",
  },
  {
    status: "Em transporte",
    location: "Centro de distribuição — Brasília/DF",
    description: "Objeto em trânsito para o estado de destino.",
  },
  {
    status: "Em transporte",
    location: "Unidade regional — estado do destinatário",
    description: "Objeto chegou ao estado de destino.",
  },
  {
    status: "Objeto na unidade de distribuição",
    location: "Unidade de distribuição — cidade do destinatário",
    description: "Objeto aguardando roteirização para entrega.",
  },
  {
    status: "Saiu para entrega",
    location: "Unidade de distribuição — cidade do destinatário",
    description: "Objeto saiu para entrega ao destinatário.",
  },
];

export type CycleResult = {
  phase: TrackingPhase;
  events: CycleEvent[];
  transitStartsAt: string;
  deliveryEstimateAt: string;
  transitBusinessDays: number;
  businessDaysElapsed: number;
};

/**
 * Monta a linha do tempo completa. `paidAt` nulo significa que o pagamento
 * ainda não foi confirmado e, portanto, o ciclo não começou.
 */
export function buildCycle(
  paidAt: string | null | undefined,
  code: string,
  now: Date = new Date(),
): CycleResult {
  const transitDays = transitBusinessDays(code);

  if (!paidAt) {
    return {
      phase: "aguardando_pagamento",
      events: [],
      transitStartsAt: "",
      deliveryEstimateAt: "",
      transitBusinessDays: transitDays,
      businessDaysElapsed: 0,
    };
  }

  const paid = new Date(paidAt);
  const transitStart = addBusinessDays(paid, SEPARATION_BUSINESS_DAYS);
  const delivery = addBusinessDays(transitStart, transitDays);
  const elapsed = businessDaysElapsed(paid, now);

  const all: CycleEvent[] = [
    {
      date: paid.toISOString(),
      status: "Pagamento confirmado",
      location: "Nova Era — Bagé/RS",
      description: "Pagamento aprovado e pedido registrado.",
    },
    {
      date: paid.toISOString(),
      status: "Em separação",
      location: "Centro de distribuição — São Paulo/SP",
      description: "Pedido em separação e embalagem (1 dia útil).",
    },
  ];

  // Distribui as paradas do transporte ao longo da janela de transporte.
  const stops = TRANSIT_STOPS.length;
  const totalMs = delivery.getTime() - transitStart.getTime();
  for (let i = 0; i < stops; i++) {
    const ratio = (i + 1) / (stops + 1);
    all.push({
      date: new Date(transitStart.getTime() + totalMs * ratio).toISOString(),
      ...TRANSIT_STOPS[i],
    });
  }

  all.push({
    date: delivery.toISOString(),
    status: "Entregue ao vizinho",
    location: "Endereço do destinatário",
    description:
      "Objeto entregue ao vizinho, conforme autorização no ato da entrega.",
  });

  const events = all.filter((e) => new Date(e.date).getTime() <= now.getTime());

  let phase: TrackingPhase = "separacao";
  if (now.getTime() >= delivery.getTime()) phase = "entregue";
  else if (now.getTime() >= transitStart.getTime()) phase = "em_transporte";

  return {
    phase,
    events,
    transitStartsAt: transitStart.toISOString(),
    deliveryEstimateAt: delivery.toISOString(),
    transitBusinessDays: transitDays,
    businessDaysElapsed: elapsed,
  };
}

export const PHASE_LABEL: Record<TrackingPhase, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  separacao: "Em separação",
  em_transporte: "Em transporte",
  entregue: "Entregue ao vizinho",
};
