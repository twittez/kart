import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { CheckoutHeader } from "@/components/CheckoutHeader";
import {
  PRODUCT,
  WARRANTY_PRICES,
  checkoutSearchSchema,
  formatBRL,
  type CheckoutSearch,
} from "@/lib/checkout-state";
import { trackTikTokEvent } from "@/lib/tiktok";

export const Route = createFileRoute("/checkout/garantia")({
  validateSearch: (search) => checkoutSearchSchema.parse(search),
  component: WarrantyPage,
});

const OPTIONS = [
  { id: "12", months: 12, recommended: false, price: 56, parcels: "10x R$ 5,60" },
  { id: "18", months: 18, recommended: true, price: 72, oldPrice: 84.71, parcels: "10x R$ 7,20" },
  { id: "24", months: 24, recommended: false, price: 112, parcels: "10x R$ 11,20" },
] as const;

function WarrantyPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<CheckoutSearch["warranty"]>(search.warranty);

  useEffect(() => {
    trackTikTokEvent("InitiateCheckout", {
      content_type: "product",
      content_id: "kart-velox",
      content_name: PRODUCT.name,
      value: PRODUCT.basePrice,
      currency: "BRL",
    });
  }, []);

  const goNext = (warranty: CheckoutSearch["warranty"]) => {
    navigate({
      to: "/checkout/dados",
      search: { ...search, warranty, shipping: "free" },
    });
  };

  return (
    <div className="min-h-screen bg-[#ebebeb] flex flex-col">
      <CheckoutHeader />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 pb-32">
        <h1 className="text-2xl sm:text-3xl font-light text-gray-900">Adicione um seguro</h1>
        <p className="text-sm text-gray-700 mt-2">
          Estende a garantia de fábrica por mais meses e cobre falhas mecânicas, conforme as condições do seguro.
        </p>

        <div className="bg-white rounded-md mt-5 p-4 sm:p-6 shadow-sm">
          <div className="flex items-start gap-3 pb-4 border-b">
            <div className="w-12 h-12 rounded-full bg-[#00a650] flex items-center justify-center text-white text-xl shrink-0">
              ✓
            </div>
            <div>
              <p className="text-xs text-gray-500">Proteções para:</p>
              <p className="text-sm font-medium text-gray-800">
                {PRODUCT.name} {search.voltage} {search.color}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {OPTIONS.map((opt) => {
              const isSelected = selected === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelected(opt.id as CheckoutSearch["warranty"])}
                  className={`relative w-full text-left rounded-md border-2 p-4 sm:p-5 transition ${
                    isSelected ? "border-[#3483fa]" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {opt.recommended && (
                    <span className="absolute -top-3 right-4 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded">
                      RECOMENDADO
                    </span>
                  )}
                  <div className="flex justify-between items-start gap-4">
                    <p className="text-base sm:text-lg font-medium text-gray-800">
                      {opt.months} meses de Garantia estendida
                    </p>
                    <div className="text-right shrink-0">
                      <p className="text-sm sm:text-base">{opt.parcels}</p>
                      <p className="text-xs text-[#00a650]">Sem juros</p>
                      <p className="text-xs text-gray-600">{formatBRL(opt.price)}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-gray-600 mt-4">
          Ao adicionar, você aceita as condições da extensão de garantia. Os termos completos são enviados por e-mail junto com a confirmação do pedido.
        </p>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => goNext("none")}
            className="px-6 py-3 rounded text-[#3483fa] bg-[#e8f0ff] font-medium text-sm"
          >
            Agora não
          </button>
          <button
            type="button"
            onClick={() => goNext(selected === "none" ? "18" : selected)}
            className="px-6 py-3 rounded bg-[#3483fa] hover:bg-[#2968c8] text-white font-medium text-sm"
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

// Suppress unused Link warning by re-exporting (may be used later)
export { Link };
