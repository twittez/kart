// ---- Configuração do gateway de pagamento ----
//
// Rotação manual entre PrimeCash e IronPay. Para trocar, basta alterar
// `ACTIVE_GATEWAY` abaixo (ou me pedir no chat: "usa ironpay" / "volta
// pra primecash"). As rotas (checkout.dados, checkout.pix, checkout.upsell)
// não precisam saber qual gateway está ativo — elas chamam sempre as
// mesmas serverFns em `primecash.functions.ts`, que internamente
// despacham para o gateway escolhido.

export type GatewayName = "primecash" | "ironpay" | "mangofy" | "winner" | "axxon" | "beehive";

export const ACTIVE_GATEWAY: GatewayName = "axxon";


// ---- IronPay ----
export const IRONPAY_OFFER_HASH = "dijrq0scn0";
export const IRONPAY_PRODUCT_HASH = "wtt3ncdj7f";
