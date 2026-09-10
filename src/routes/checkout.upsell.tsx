import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { formatBRL, PRODUCT } from "@/lib/checkout-state";
import { createUpsellPixTransaction } from "@/utils/primecash.functions";
import kartPrincipal from "@/assets/kart/kart-principal-2.jpg";
import kartVermelho from "@/assets/kart/kart-vermelho.jpg";
import kartAmarelo from "@/assets/kart/kart-amarelo.jpg";

export const Route = createFileRoute("/checkout/upsell")({
  component: UpsellPage,
});

// Mantém alinhado com src/utils/primecash.functions.ts -> UPSELL_PRODUCT
const UPSELL_PRICE = +(PRODUCT.basePrice * 0.7).toFixed(2); // R$ 96,53
const UPSELL_ORIGINAL = PRODUCT.basePrice; // R$ 137,90

function UpsellPage() {
  const navigate = useNavigate();
  const createUpsell = useServerFn(createUpsellPixTransaction);

  const [amountCents, setAmountCents] = useState(0);
  const [originalSessionId, setOriginalSessionId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Galeria de imagens do kart
  const images = [kartPrincipal, kartVermelho, kartAmarelo];
  const [activeImg, setActiveImg] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    setAmountCents(Number(sp.get("amount") || 0));
    setOriginalSessionId(sp.get("s") || "");
  }, []);

  // Auto-rotaciona galeria a cada 3.5s
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setActiveImg((i) => (i + 1) % images.length);
    }, 3500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [images.length]);

  const goSuccess = () =>
    navigate({ to: `/checkout/sucesso?amount=${amountCents}` });

  const accept = async () => {
    setError(null);
    if (!originalSessionId) {
      setError(
        "Sessão expirada. Você será redirecionado para refazer o pedido."
      );
      setTimeout(() => {
        window.location.href = "/checkout/dados";
      }, 1500);
      return;
    }
    setLoading(true);
    try {
      const r = await createUpsell({ data: { sessionId: originalSessionId } });
      if (!r.ok) {
        setError(r.error || "Não foi possível gerar o PIX da segunda unidade.");
        setLoading(false);
        return;
      }
      navigate({ to: `/checkout/pix?s=${r.sessionId}` });
    } catch (e) {
      setError("Falha ao gerar PIX. Tente novamente.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col pb-10">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <span className="w-8 h-8" />
          <h1 className="flex-1 text-center text-base font-bold text-gray-900 uppercase tracking-wide">
Item adicional opcional
          </h1>
          <div className="w-8" />
        </div>
      </header>

      <main className="flex-1 max-w-xl w-full mx-auto px-3 py-4 space-y-3">
        {/* Confirmação do pedido anterior */}
        <section className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4 flex items-start gap-3 shadow-sm">
          <span className="w-11 h-11 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xl shrink-0 shadow">
            ✓
          </span>
          <div className="text-emerald-900 leading-snug">
            <p className="font-extrabold text-lg sm:text-xl">
              Pedido registrado
            </p>
            <p className="text-sm sm:text-base font-medium mt-1">
              Se quiser, você pode incluir uma
              <strong> segunda unidade do Kart</strong> no mesmo envio. É opcional.
            </p>
          </div>
        </section>

        {/* Produto */}
        <section className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="relative bg-gray-100">
            <img
              src={images[activeImg]}
              alt="Kart Velox"
              className="w-full h-auto block transition-opacity duration-500"
            />
            {/* Indicadores da galeria */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImg(i)}
                  aria-label={`Imagem ${i + 1}`}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === activeImg
                      ? "bg-white w-6"
                      : "bg-white/60 hover:bg-white/90"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="p-4 space-y-3">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl font-bold text-[#ff3a30]">
                {formatBRL(UPSELL_PRICE)}
              </span>
              <span className="text-[11px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded">
                FRETE GRÁTIS
              </span>
            </div>

            <div className="inline-block bg-gray-100 text-gray-700 text-[11px] font-medium px-2 py-1 rounded">
              Segunda unidade · Mesmo envio do seu pedido
            </div>

            <h2 className="text-base font-bold text-gray-900 leading-snug">
              Adicionar uma segunda unidade do Kart Velox
            </h2>

            <ul className="text-xs text-gray-700 space-y-1.5 pt-1">
              <li className="flex gap-2">
                <span className="text-emerald-500">✓</span>
                <span>
                  Valor da segunda unidade: {formatBRL(UPSELL_PRICE)} (preço avulso:{" "}
                  {formatBRL(UPSELL_ORIGINAL)})
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500">✓</span>
                <span>
                  <strong>Frete grátis</strong> — vai junto com o seu pedido
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500">✓</span>
                <span>Enviada no mesmo pedido, para presente ou para brincar em dupla</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500">✓</span>
                <span>
Mesma garantia de fábrica de 3 meses e 7 dias de direito de
                  arrependimento
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* Erro */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2 text-center">
            {error}
          </div>
        )}

        {/* CTA aceitar */}
        <button
          type="button"
          onClick={accept}
          disabled={loading}
          className="w-full bg-[#ff3a30] hover:bg-[#e6332a] disabled:opacity-60 text-white py-3.5 rounded-lg font-bold text-sm transition-colors shadow-md"
        >
          {loading
            ? "Gerando PIX..."
            : `Adicionar a 2ª unidade por ${formatBRL(UPSELL_PRICE)}`}
        </button>

        {/* Recusar */}
        <button
          type="button"
          onClick={goSuccess}
          disabled={loading}
          className="w-full bg-transparent text-gray-500 py-2 text-xs underline hover:text-gray-700 disabled:opacity-60"
        >
          Não, obrigado. Continuar com apenas 1 unidade.
        </button>

        <p className="text-[11px] text-center text-gray-400 pt-1">
Item opcional. Você pode seguir sem adicioná-lo.
        </p>

        <div className="text-center pt-1">
          <Link to="/" className="text-[#ff3a30] text-xs underline">
            ← Voltar à loja
          </Link>
        </div>
      </main>
    </div>
  );
}
