import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { useState, useEffect } from "react";
import { z } from "zod";
import { trackTikTokEvent } from "@/lib/tiktok";
import productMain from "@/assets/kart/product-main.jpg";
import productDetail1 from "@/assets/kart/kart-principal-2.jpg";
import productDetail2 from "@/assets/kart/kart-preto.jpg";
import productDetail3 from "@/assets/kart/kart-verde.jpg";
import productDescription from "@/assets/kart/kart-vermelho.jpg";
import productDescription2 from "@/assets/kart/kart-amarelo.jpg";
import storeAvatar from "@/assets/kart/product-main.jpg";
import variantPreto from "@/assets/kart/kart-preto.jpg";
import variantVerde from "@/assets/kart/kart-verde.jpg";
import variantVermelho from "@/assets/kart/kart-vermelho.jpg";
import variantAmarelo from "@/assets/kart/kart-amarelo.jpg";
import { PRODUCT, VARIANT_LABELS, VARIANT_PRICE_ADDON, formatBRL } from "@/lib/checkout-state";

type VariantKey = "garantia-normal" | "garantia-estendida-seguro" | "kart-vermelho" | "kart-amarelo";

const productSearchSchema = z.object({
  color: fallback(
    z.enum(["garantia-normal", "garantia-estendida-seguro", "kart-vermelho", "kart-amarelo"]),
    "garantia-normal"
  ).default("garantia-normal"),
  image: fallback(z.number().int().min(0).max(3), 0).default(0),
});

export const Route = createFileRoute("/")({
  validateSearch: zodValidator(productSearchSchema),
  head: () => ({
    meta: [
      { title: "Kart Velox 4 rodas — Mini kart off-road a combustão" },
      {
        name: "description",
        content:
          "Kart Velox 4 rodas a combustão, com motor 90cc, freios a disco duplo e chassi de aço. Frete grátis para todo o Brasil e entrega em 5 a 8 dias úteis.",
      },
      { property: "og:title", content: "Kart Velox 4 rodas — Mini kart off-road" },
      {
        property: "og:description",
        content:
          "Kart Velox a gasolina 90cc, 4 rodas off-road, freio a disco duplo e chassi de aço. Indicado para maiores de 8 anos com supervisão de um adulto.",
      },
      { property: "og:type", content: "product" },
      { property: "og:url", content: "https://project-uplift-offer.lovable.app/" },
      { property: "og:image", content: productMain },
      { name: "twitter:image", content: productMain },
    ],
    links: [{ rel: "canonical", href: "https://project-uplift-offer.lovable.app/" }],
  }),
  component: ProductPage,
});

const IMAGES = [productMain, productDetail1, productDetail2, productDetail3];

const VARIANT_IMAGES: Record<VariantKey, string> = {
  "garantia-normal": variantPreto,
  "garantia-estendida-seguro": variantVerde,
  "kart-vermelho": variantVermelho,
  "kart-amarelo": variantAmarelo,
};

const PRICE = PRODUCT.basePrice;
const INSTALLMENT = (PRICE / 6).toLocaleString("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const FAQS = [
  {
    q: "Para que idade é indicado?",
    a: "Indicado para maiores de 8 anos, sempre com supervisão de um adulto, uso de equipamento de proteção e em área fechada e apropriada. Capacidade de até 125 kg.",
  },
  {
    q: "Qual o prazo de entrega?",
    a: "Frete grátis para todo o Brasil, com entrega estimada em 5 a 8 dias úteis após a confirmação do pagamento. Regiões remotas podem ter prazo maior.",
  },
  {
    q: "Como funciona a garantia?",
    a: "O produto tem 3 meses de garantia de fábrica contra defeitos de fabricação. Você também tem 7 dias corridos de direito de arrependimento a partir do recebimento, conforme o Código de Defesa do Consumidor.",
  },
  {
    q: "Posso trocar ou devolver?",
    a: "Sim. Consulte as condições completas na Política de Reembolso e Trocas ou fale com o nosso atendimento pelos canais da página de contato.",
  },
];

function ProductPage() {
  const navigate = useNavigate({ from: "/" });
  const search = Route.useSearch();
  const variant: VariantKey = search.color;
  const image = search.image;
  const safeIdx = Math.min(image, IMAGES.length - 1);
  const mainImg = IMAGES[safeIdx];
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showVariantSheet, setShowVariantSheet] = useState(false);
  const [sheetSelection, setSheetSelection] = useState<VariantKey | null>(null);

  useEffect(() => {
    trackTikTokEvent("ViewContent", {
      content_type: "product",
      content_id: "kart-velox",
      content_name: PRODUCT.name,
      value: PRICE,
      currency: "BRL",
    });
  }, []);

  const openSheet = () => {
    setSheetSelection(variant);
    setShowVariantSheet(true);
  };

  const confirmPurchase = () => {
    const chosen = sheetSelection ?? variant;
    setShowVariantSheet(false);
    navigate({
      to: "/checkout/garantia",
      search: {
        color: chosen,
        voltage: "127v",
        warranty: "none",
        shipping: "free",
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 pb-24 max-w-md mx-auto">
      {/* Header */}
      <header className="w-full bg-white px-4 py-2.5 flex items-center justify-between sticky top-0 z-20 border-b border-gray-100">
        <span className="text-sm font-bold text-gray-900">Nova Era</span>
        <Link to="/contato" className="text-xs text-gray-500 hover:text-gray-800">
          Atendimento
        </Link>
      </header>

      {/* Galeria */}
      <section className="relative bg-white">
        <div className="relative aspect-square bg-white flex items-center justify-center overflow-hidden">
          <img
            key={safeIdx}
            src={mainImg}
            alt={PRODUCT.shortName}
            className="h-full w-full object-contain"
            loading={safeIdx === 0 ? "eager" : "lazy"}
            decoding="async"
          />
          <Link
            to="/"
            search={{ color: variant, image: safeIdx === 0 ? IMAGES.length - 1 : safeIdx - 1 }}
            replace
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white"
            aria-label="Anterior"
          >
            ‹
          </Link>
          <Link
            to="/"
            search={{ color: variant, image: safeIdx === IMAGES.length - 1 ? 0 : safeIdx + 1 }}
            replace
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white"
            aria-label="Próxima"
          >
            ›
          </Link>
          <span className="absolute bottom-3 right-3 bg-black/50 text-white text-[11px] px-2 py-0.5 rounded-full">
            {safeIdx + 1}/{IMAGES.length}
          </span>
        </div>
        {/* Thumbs */}
        <div className="flex gap-2 px-4 py-2 overflow-x-auto">
          {IMAGES.map((src, i) => (
            <Link
              key={i}
              to="/"
              search={{ color: variant, image: i }}
              replace
              className={`w-14 h-14 shrink-0 rounded-md overflow-hidden border-2 ${safeIdx === i ? "border-[#fe2c55]" : "border-transparent"}`}
            >
              <img src={src} alt={`Imagem ${i + 1} do Kart Velox`} className="w-full h-full object-contain" loading="lazy" />
            </Link>
          ))}
        </div>
      </section>

      {/* Preço */}
      <section className="bg-white px-4 py-4 border-b border-gray-100">
        <span className="text-3xl font-extrabold text-gray-900">
          R$ {PRICE.toFixed(2).replace(".", ",")}
        </span>
        <p className="text-xs text-gray-500 mt-1">Preço à vista no PIX. Frete grátis incluído.</p>
      </section>

      {/* Parcelamento */}
      <div className="bg-white px-4 py-2 flex items-center gap-2 border-b border-gray-100">
        <span className="text-gray-400">💳</span>
        <span className="text-sm text-gray-600">
          6x de <strong className="text-gray-800">R$ {INSTALLMENT}</strong> sem juros no cartão
        </span>
      </div>

      {/* Título */}
      <section className="bg-white px-4 py-3">
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">{PRODUCT.name}</h1>
        <p className="text-xs text-gray-500 mt-1">
          Vendido e entregue por Nova Era · Produto com nota fiscal
        </p>
      </section>

      {/* Frete */}
      <section className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 bg-green-600 text-white text-xs font-bold px-2.5 py-1 rounded">🚚 Frete grátis</span>
          <div>
            <span className="text-sm text-gray-800">Receba em <strong>5 a 8 dias úteis</strong></span>
            <div className="text-xs text-gray-500">Envio para todo o Brasil, com código de rastreio.</div>
          </div>
        </div>
      </section>

      <div className="h-2 bg-gray-100" />

      {/* Características */}
      <section className="bg-white px-4 py-4">
        <div className="flex items-center gap-2 mb-3">
          <span>🛡️</span>
          <span className="text-sm font-semibold text-gray-900">Principais características</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: "🏁", text: "Motor 90cc 2 tempos", color: "text-orange-500" },
            { icon: "🛞", text: "4 rodas off-road", color: "text-blue-500" },
            { icon: "🛡️", text: "Freio a disco duplo", color: "text-green-600" },
            { icon: "🚚", text: "Frete grátis Brasil", color: "text-emerald-600" },
          ].map((it) => (
            <div key={it.text} className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2.5">
              <span className={`${it.color}`}>{it.icon}</span>
              <span className="text-xs font-medium text-gray-900">{it.text}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-700 text-center">
            Pagamento processado por gateway certificado. Você tem 7 dias de direito de
            arrependimento e 3 meses de garantia de fábrica — condições na{" "}
            <Link to="/politica-de-reembolso" className="underline">
              Política de Reembolso
            </Link>
            .
          </p>
        </div>
      </section>

      <div className="h-2 bg-gray-100" />

      {/* Variantes */}
      <section className="px-4 py-3 bg-white">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Escolha a cor</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(VARIANT_LABELS) as VariantKey[]).map((v) => (
            <Link
              key={v}
              to="/"
              search={{ color: v, image: 0 }}
              replace
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                variant === v ? "border-[#fe2c55] bg-red-50 text-[#fe2c55]" : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              <img src={VARIANT_IMAGES[v]} alt={VARIANT_LABELS[v]} className="w-6 h-6 rounded object-cover" loading="lazy" />
              <span>{VARIANT_LABELS[v]}</span>
              {VARIANT_PRICE_ADDON[v] ? (
                <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold bg-[#ff3a30] text-white">
                  {`+ ${formatBRL(VARIANT_PRICE_ADDON[v])}`}
                </span>
              ) : (
                <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold bg-gray-100 text-gray-600">
                  Mesmo preço
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>

      <div className="h-2 bg-gray-100" />

      {/* Store info */}
      <section className="bg-white px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
            <img src={storeAvatar} alt="Nova Era" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-sm font-bold text-gray-900">Nova Era</span>
            </div>
            <p className="text-xs text-gray-500">
              CNPJ 97.083.380/0001-07 · Atendimento de seg. a sex., 9h às 18h
            </p>
          </div>
        </div>
      </section>

      <div className="h-2 bg-gray-100" />

      {/* Descrição */}
      <section className="bg-white px-4 py-5">
        <h2 className="text-base font-bold text-gray-900 mb-4">Sobre o produto</h2>
        <div className="text-sm text-gray-600 leading-relaxed space-y-4">
          <p>
            O <strong className="text-gray-900">Kart Velox 4 rodas</strong> foi
            projetado para uso recreativo em áreas fechadas e apropriadas, como pistas, sítios e terrenos
            particulares. Indicado para maiores de 8 anos e adultos iniciantes, sempre com supervisão e
            equipamento de proteção.
          </p>
          <img src={productDescription} alt="Kart Velox na cor vermelha" className="w-full rounded-lg" loading="lazy" />
          <p>
            <strong className="text-gray-900">Motor 90cc:</strong> motor a gasolina 2 tempos com partida
            manual e velocidade máxima de 25 km/h, conforme especificação do fabricante.
          </p>
          <p>
            <strong className="text-gray-900">Rodas todo-terreno:</strong> 4 rodas com pneus de banda
            cravada, indicadas para areia, terra e grama.
          </p>
          <img src={productDescription2} alt="Kart Velox na cor amarela" className="w-full rounded-lg" loading="lazy" />
          <p>
            <strong className="text-gray-900">Freios a disco duplo:</strong> sistema de frenagem nas duas
            rodas traseiras. O uso de capacete e demais equipamentos de proteção é obrigatório.
          </p>
          <p>
            <strong className="text-gray-900">Chassi de aço:</strong> estrutura tubular com barra de
            proteção, peso de 35 kg e capacidade de carga de até 125 kg.
          </p>
          <p>
            <strong className="text-gray-900">Montagem:</strong> chega parcialmente montado. A montagem
            leva cerca de 2 horas e acompanha manual e ferramentas básicas.
          </p>
          <p>
            <strong className="text-gray-900">Cores disponíveis:</strong> preto, verde, vermelho e amarelo,
            com assento ajustável.
          </p>
          <p className="text-xs text-gray-500">
            Atenção: produto motorizado de uso recreativo. Não é homologado para circulação em vias
            públicas. Utilize apenas em local privado e adequado, com supervisão de um adulto responsável.
          </p>
        </div>
      </section>

      {/* Especificações */}
      <section className="px-4 py-5 bg-white">
        <h2 className="text-sm font-bold text-gray-900 uppercase mb-3">Especificações Técnicas</h2>
        <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-600">
          <li><strong className="text-gray-900">Produto:</strong> Kart Velox 4 rodas</li>
          <li><strong className="text-gray-900">Motor:</strong> 90cc, 2 tempos</li>
          <li><strong className="text-gray-900">Velocidade máxima:</strong> 25 km/h</li>
          <li><strong className="text-gray-900">Chassi:</strong> Aço tubular</li>
          <li><strong className="text-gray-900">Peso:</strong> 35 kg</li>
          <li><strong className="text-gray-900">Capacidade:</strong> Até 125 kg</li>
          <li><strong className="text-gray-900">Freios:</strong> Disco duplo</li>
          <li><strong className="text-gray-900">Rodas:</strong> 4 rodas todo-terreno</li>
          <li><strong className="text-gray-900">Combustível:</strong> Gasolina (recomendada aditivada)</li>
          <li><strong className="text-gray-900">Dimensões:</strong> 120 x 70 x 60 cm</li>
          <li><strong className="text-gray-900">Idade indicada:</strong> 8+ anos, com supervisão</li>
        </ul>
      </section>

      <div className="h-2 bg-gray-100" />

      {/* Envio */}
      <section className="px-4 py-5 bg-white">
        <h2 className="text-base font-bold text-gray-900 mb-4">Envio e Entrega</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-gray-500">⏰</span>
            <div>
              <p className="text-sm font-semibold text-gray-900">Prazo de entrega</p>
              <p className="text-xs text-gray-600">
                Entrega estimada em <strong>5 a 8 dias úteis</strong> após a confirmação do pagamento.
                Pedidos aprovados até as 14h são despachados no mesmo dia útil.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-gray-500">📍</span>
            <div>
              <p className="text-sm font-semibold text-gray-900">Rastreamento</p>
              <p className="text-xs text-gray-600">
                O código de rastreio é enviado por e-mail após o despacho e pode ser consultado na página
                de rastreio.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-gray-500">🛡️</span>
            <div>
              <p className="text-sm font-semibold text-gray-900">Extravio ou avaria</p>
              <p className="text-xs text-gray-600">
                Se o pedido for extraviado ou chegar danificado no transporte, reenviamos o produto ou
                devolvemos o valor pago, conforme a Política de Reembolso.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-gray-50 rounded p-2.5">
            <span className="text-sm font-bold">🇧🇷 BR</span>
            <p className="text-xs text-gray-700">
              Enviamos para <strong className="text-gray-900">todos os estados do Brasil</strong>. Para
              regiões remotas, o prazo pode ser maior.
            </p>
          </div>
        </div>
      </section>

      <div className="h-2 bg-gray-100" />

      {/* FAQ */}
      <section className="px-4 py-5 bg-white">
        <h2 className="text-base font-bold text-gray-900 mb-3">Perguntas Frequentes</h2>
        <div className="divide-y divide-gray-100">
          {FAQS.map((f, i) => {
            const isOpen = openFaq === i;
            return (
              <div key={i}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="w-full text-left py-3 flex items-start justify-between gap-3"
                >
                  <span className="text-sm text-gray-800 flex-1 font-medium">{f.q}</span>
                  <span className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
                </button>
                {isOpen && <p className="text-sm text-gray-600 leading-relaxed pb-3 -mt-1">{f.a}</p>}
              </div>
            );
          })}
        </div>
      </section>

      <div className="h-2 bg-gray-100" />

      {/* Footer */}
      <footer className="bg-white px-4 py-6 border-t border-gray-100">
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-2">Institucional</h3>
            <div className="space-y-1 text-xs text-gray-600">
              <Link to="/sobre" className="block hover:text-[#fe2c55]">Sobre nós</Link>
              <Link to="/faq" className="block hover:text-[#fe2c55]">Perguntas frequentes</Link>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-2">Atendimento</h3>
            <div className="space-y-1 text-xs text-gray-600">
              <Link to="/contato" className="block hover:text-[#fe2c55]">Contato</Link>
              <Link to="/politica-de-envio" className="block hover:text-[#fe2c55]">Rastrear pedido</Link>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-2">Compra</h3>
            <div className="space-y-1 text-xs text-gray-600">
              <Link to="/politica-de-envio" className="block hover:text-[#fe2c55]">Envio e entrega</Link>
              <Link to="/politica-de-reembolso" className="block hover:text-[#fe2c55]">Trocas e reembolso</Link>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-2">Legal</h3>
            <div className="space-y-1 text-xs text-gray-600">
              <Link to="/politica-de-privacidade" className="block hover:text-[#fe2c55]">Política de privacidade</Link>
              <Link to="/termos-de-uso" className="block hover:text-[#fe2c55]">Termos de uso</Link>
            </div>
          </div>
        </div>
        <div className="text-center border-t border-gray-100 pt-4 space-y-1">
          <p className="text-xs text-gray-500">
            NOVA ERA BRINQUEDOS LTDA · CNPJ 97.083.380/0001-07 · Av. General Osório, 1139 — Centro, Bagé — RS, CEP 96400-100
          </p>
          <p className="text-xs text-gray-500">
            re.novaera@gmail.com · Telefone (53) 3242-3133
          </p>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} Nova Era.</p>
        </div>
      </footer>

      {/* Variant sheet */}
      {showVariantSheet && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowVariantSheet(false)} />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 rounded-t-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-800">Escolha a cor</h3>
              <button onClick={() => setShowVariantSheet(false)} className="text-gray-400 text-xl leading-none">✕</button>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(Object.keys(VARIANT_LABELS) as VariantKey[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setSheetSelection(v)}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-2 transition-colors ${
                    sheetSelection === v ? "border-[#fe2c55] bg-red-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="w-full aspect-square rounded-lg overflow-hidden bg-white">
                    <img src={VARIANT_IMAGES[v]} alt={VARIANT_LABELS[v]} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[11px] font-medium text-gray-700 text-center leading-tight">{VARIANT_LABELS[v]}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={confirmPurchase}
              disabled={!sheetSelection}
              className={`w-full rounded-full py-3 text-sm font-bold text-white transition-colors ${
                sheetSelection ? "bg-[#fe2c55] hover:bg-red-600" : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              Continuar
            </button>
          </div>
        </>
      )}

      {/* Bottom nav fixo */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 z-30 shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
        <div className="flex items-center h-16">
          <div className="flex items-center">
            <Link to="/faq" className="flex flex-col items-center justify-center w-14 h-14 text-gray-500">
              <span className="text-xl">❔</span>
              <span className="text-[10px] mt-0.5">Ajuda</span>
            </Link>
            <Link to="/contato" className="flex flex-col items-center justify-center w-14 h-14 text-gray-500">
              <span className="text-xl">💬</span>
              <span className="text-[10px] mt-0.5">Contato</span>
            </Link>
          </div>
          <div className="flex flex-1 items-center gap-2 px-2">
            <button
              type="button"
              onClick={openSheet}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-bold text-[#fe2c55] active:bg-red-50 border border-transparent"
            >
              🛒 Adicionar ao carrinho
            </button>
            <button
              type="button"
              onClick={openSheet}
              className="flex-1 flex items-center justify-center rounded-lg bg-[#fe2c55] py-2.5 text-sm font-bold text-white uppercase tracking-wide active:bg-red-700"
            >
              Comprar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
