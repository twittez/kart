// Shared types and helpers for the checkout flow
import { z } from "zod";

export const PRODUCT = {
  name: "Kart Velox 4 rodas",
  shortName: "Kart Velox",
  basePrice: 137.9,
  originalPrice: 844.0,
};

// `color` represents the product option key.
// `voltage` is kept in the schema for backwards compatibility with previously
// deployed URLs but is no longer surfaced in the UI for this product.
export const checkoutSearchSchema = z.object({
  color: z
    .enum(["garantia-normal", "garantia-estendida-seguro", "kart-vermelho", "kart-amarelo"])
    .catch("garantia-normal"),
  voltage: z.enum(["127v", "220v"]).catch("127v"),
  warranty: z.enum(["none", "12", "18", "24"]).catch("none"),
  shipping: z.enum(["free", "express", "full"]).catch("free"),
  /** Order bump pré-selecionado via URL (ex.: vindo da página de oferta cross-sell). */
  bump: z.string().optional().catch(undefined),
});

export type CheckoutSearch = z.infer<typeof checkoutSearchSchema>;

// Mantemos as chaves originais do enum para compatibilidade com URLs antigas e
// schema do banco; rotulamos como cores do kart na UI.
export const VARIANT_LABELS: Record<string, string> = {
  "garantia-normal": "Preto",
  "garantia-estendida-seguro": "Verde",
  "kart-vermelho": "Vermelho",
  "kart-amarelo": "Amarelo",
};

export const VARIANT_PRICE_ADDON: Record<string, number> = {
  "garantia-normal": 0,
  "garantia-estendida-seguro": 0,
  "kart-vermelho": 0,
  "kart-amarelo": 0,
};

export const ORDER_BUMPS = [
  {
    id: "garantia-compra",
    name: "Garantia de Compra Protegida",
    price: 19.9,
  },
  {
    id: "capacete-ls2",
    name: "Capacete LS2 FF358 Classic Draze Preto (tamanho único)",
    price: 59.9,
  },
  {
    id: "luva-x11",
    name: "Luva X11 Blackout Moto Motoqueiro Motociclista Motoboy Preto",
    price: 39.9,
  },
  {
    id: "motinha-eletrica",
    name: "Motinha Pro Racing 90cc - MXF Motors (oferta combo)",
    price: 129.9,
  },
] as const;

/** Order bumps mostrados na tela do checkout. A motinha é vendida via página
 *  dedicada `/oferta-motinha` (oferta cross-sell antes do checkout) e não deve
 *  aparecer junto dos demais bumps. */
export const VISIBLE_ORDER_BUMP_IDS: ReadonlyArray<(typeof ORDER_BUMPS)[number]["id"]> = [
  "garantia-compra",
  "capacete-ls2",
  "luva-x11",
];

export type OrderBumpId = (typeof ORDER_BUMPS)[number]["id"];

export function calcOrderBumpsTotal(orderBumps: OrderBumpId[] = []) {
  return orderBumps.reduce((sum, id) => {
    const item = ORDER_BUMPS.find((bump) => bump.id === id);
    return sum + (item?.price ?? 0);
  }, 0);
}

export const WARRANTY_PRICES: Record<string, number> = {
  none: 0,
  "12": 56,
  "18": 72,
  "24": 112,
};

export const SHIPPING_PRICES: Record<string, number> = {
  free: 0,
  express: 14.5,
  full: 27.42,
};

export const SHIPPING_LABELS: Record<string, { title: string; subtitle: string }> = {
  free: { title: "Envio Padrão", subtitle: "5 a 8 dias úteis" },
  express: { title: "Envio Express", subtitle: "2 a 3 dias úteis" },
  full: { title: "Envio Full", subtitle: "Chegará Amanhã" },
};

export function calcTotal(
  s: Pick<CheckoutSearch, "warranty" | "shipping" | "color"> & {
    orderBumps?: OrderBumpId[];
  }
) {
  const addon = VARIANT_PRICE_ADDON[s.color] ?? 0;
  return PRODUCT.basePrice + addon + WARRANTY_PRICES[s.warranty] + SHIPPING_PRICES[s.shipping] + calcOrderBumpsTotal(s.orderBumps);
}

export function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Authoritative server-side total in cents — never trust client amounts. */
export function calcTotalCents(
  s: Pick<CheckoutSearch, "warranty" | "shipping" | "color"> & {
    orderBumps?: OrderBumpId[];
  }
) {
  return Math.round(calcTotal(s) * 100);
}
