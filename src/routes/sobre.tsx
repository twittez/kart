import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre nós — Nova Era" },
      { name: "description", content: "Conheça a Nova Era, loja especializada em produtos de lazer motorizados e brinquedos." },
    ],
  }),
  component: () => (
    <LegalPage title="Sobre a Nova Era">
      <p>A <strong>Nova Era</strong> nasceu com o propósito de levar praticidade ao dia a dia das famílias brasileiras, oferecendo produtos de lazer motorizados e brinquedos, com nota fiscal e garantia de fábrica.</p>

      <h2 className="text-lg font-semibold mt-6">Nossa missão</h2>
      <p>Oferecer produtos de lazer motorizados com informação clara, envio rastreado e atendimento próximo do cliente.</p>

      <h2 className="text-lg font-semibold mt-6">Por que comprar conosco</h2>
      <ul className="list-disc pl-6 space-y-2">
        <li>✅ Produtos com nota fiscal</li>
        <li>✅ Garantia de fábrica</li>
        <li>✅ Frete grátis para todo o Brasil</li>
        <li>✅ Atendimento humanizado</li>
        <li>✅ Site com criptografia SSL e pagamento por gateway certificado</li>
      </ul>

      <h2 className="text-lg font-semibold mt-6">Compromisso com o cliente</h2>
      <p>Trabalhamos para entregar a melhor experiência de compra, do clique até a entrega. Nosso suporte está disponível para sanar qualquer dúvida antes, durante e depois da compra.</p>
    </LegalPage>
  ),
});
