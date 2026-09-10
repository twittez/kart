import { Link } from "@tanstack/react-router";

export function CheckoutHeader() {
  return (
    <header className="bg-white w-full border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="shrink-0 text-base font-bold text-gray-900">
          Nova Era
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="hidden sm:inline text-gray-600">
            🔒 Pagamento processado por gateway certificado
          </span>
          <Link to="/contato" className="text-gray-800 hover:underline">
            Contato
          </Link>
        </div>
      </div>
    </header>
  );
}
