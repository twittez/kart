import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="bg-white border-t mt-8 pb-24 md:pb-8">
      <div className="max-w-6xl mx-auto px-4 py-8 grid gap-8 md:grid-cols-4 text-sm text-gray-700">
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Nova Era</h3>
          <p className="text-xs leading-relaxed text-gray-600">
            Loja de produtos de lazer motorizados. Produtos enviados com nota fiscal e garantia de
            fábrica.
          </p>
          <p className="text-xs mt-3 text-gray-600">NOVA ERA BRINQUEDOS LTDA · CNPJ: 97.083.380/0001-07</p>
          <p className="text-xs mt-1 text-gray-600">Av. General Osório, 1139 — Centro, Bagé — RS, CEP 96400-100</p>

        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Institucional</h3>
          <ul className="space-y-2 text-xs">
            <li><Link to="/sobre" className="hover:underline">Sobre nós</Link></li>
            <li><Link to="/contato" className="hover:underline">Contato</Link></li>
            <li><Link to="/faq" className="hover:underline">Perguntas frequentes</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Políticas</h3>
          <ul className="space-y-2 text-xs">
            <li><Link to="/politica-de-privacidade" className="hover:underline">Política de Privacidade</Link></li>
            <li><Link to="/termos-de-uso" className="hover:underline">Termos de Uso</Link></li>
            <li><Link to="/politica-de-reembolso" className="hover:underline">Política de Reembolso</Link></li>
            <li><Link to="/politica-de-envio" className="hover:underline">Política de Envio e Entrega</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Atendimento</h3>
          <ul className="space-y-2 text-xs">
            <li>📧 re.novaera@gmail.com</li>
            <li>📞 Telefone: (53) 3242-3133</li>
            <li>🕐 Seg a Sex: 9h às 18h</li>
          </ul>
          <div className="flex gap-2 mt-4">
            <span className="text-xs px-2 py-1 bg-gray-100 rounded border">🔒 Conexão segura (SSL)</span>
          </div>
        </div>
      </div>
      <div className="border-t">
        <div className="max-w-6xl mx-auto px-4 py-4 text-xs text-gray-500 text-center">
          © {new Date().getFullYear()} Nova Era — Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
