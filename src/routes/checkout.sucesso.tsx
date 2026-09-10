import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { formatBRL } from "@/lib/checkout-state";
import { trackTikTokEvent, sendTikTokServerEvent } from "@/lib/tiktok";
import { getAttribution } from "@/lib/attribution";

export const Route = createFileRoute("/checkout/sucesso")({
  component: SucessoPage,
});

function SucessoPage() {
  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const amountCents = Number(params.get("amount") || 0);
  const amount = amountCents / 100;

  useEffect(() => {
    const val = amount > 0 ? amount : 137.9;
    const eventId = params.get("s") || `order_${Date.now()}`;
    trackTikTokEvent(
      "CompletePayment",
      {
        content_type: "product",
        content_id: "kart-velox",
        value: val,
        currency: "BRL",
      },
      eventId
    );
    void sendTikTokServerEvent({
      event: "CompletePayment",
      eventId,
      amount: val,
      currency: "BRL",
      ttclid: getAttribution().ttclid,
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col pb-10">
      {/* Header TikTok-style */}
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            to="/"
            className="text-gray-700 text-xl leading-none w-8 h-8 flex items-center justify-center -ml-1"
          >
            ←
          </Link>
          <h1 className="flex-1 text-center text-base font-semibold text-gray-900">
            Pedido confirmado
          </h1>
          <div className="w-8" />
        </div>
        <div className="max-w-xl mx-auto px-4 pb-2 -mt-1 text-center">
          <span className="text-xs text-emerald-600 font-medium inline-flex items-center gap-1">
            🔒 Dados transmitidos com criptografia SSL
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-xl w-full mx-auto px-3 py-4 space-y-3">
        <section className="bg-white rounded-xl p-6 shadow-sm text-center">
          <div className="w-16 h-16 mx-auto bg-emerald-500 rounded-full flex items-center justify-center text-white text-3xl shadow-md">
            ✓
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mt-4">
            Pagamento confirmado!
          </h2>
          {amount > 0 && (
            <p className="text-sm text-gray-600 mt-1.5">
              Recebemos seu pagamento de{" "}
              <strong className="text-[#ff3a30]">{formatBRL(amount)}</strong>.
            </p>
          )}
          <p className="text-xs text-gray-500 mt-3 leading-relaxed">
            Em breve você receberá um e-mail com os detalhes da compra e do
            envio.
          </p>
        </section>

        <section className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-900 mb-3">
            Próximos passos
          </p>
          <ol className="space-y-2.5">
            {[
              "Você recebe a confirmação por e-mail.",
              "Separamos seu pedido em até 24h úteis.",
              "Enviamos com código de rastreio.",
              "Acompanhe a entrega pelo e-mail recebido.",
            ].map((t, i) => (
              <li
                key={i}
                className="flex gap-2.5 items-start text-xs text-gray-700"
              >
                <span className="shrink-0 w-5 h-5 rounded-full bg-[#fff1f0] text-[#ff3a30] text-[11px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{t}</span>
              </li>
            ))}
          </ol>
        </section>

        <Link
          to="/politica-de-envio"
          className="block w-full text-center bg-[#f4b400] hover:bg-[#ffc933] text-[#0b1633] py-3 rounded-lg font-bold text-sm transition-colors"
        >
          Rastrear meu pedido
        </Link>
        <Link
          to="/"
          className="block w-full text-center bg-[#ff3a30] hover:bg-[#e6332a] text-white py-3 rounded-lg font-semibold text-sm transition-colors"
        >
          Voltar à loja
        </Link>
      </main>
    </div>
  );
}
