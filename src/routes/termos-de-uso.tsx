import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/termos-de-uso")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Nova Era" },
      { name: "description", content: "Termos e condições de uso da loja Nova Era." },
    ],
  }),
  component: () => (
    <LegalPage title="Termos de Uso">
      <p><strong>Última atualização:</strong> {new Date().toLocaleDateString("pt-BR")}</p>
      <p>Ao acessar e utilizar este site, você concorda com os termos descritos abaixo.</p>

      <h2 className="text-lg font-semibold mt-6">1. Sobre a loja</h2>
      <p>A Nova Era é uma loja virtual especializada em produtos de lazer motorizados e brinquedos, operando em conformidade com o Código de Defesa do Consumidor (Lei nº 8.078/1990).</p>

      <h2 className="text-lg font-semibold mt-6">2. Pedidos e pagamentos</h2>
      <p>Os pedidos são confirmados após a aprovação do pagamento. Aceitamos PIX como forma de pagamento. Os preços estão expressos em reais (R$) e incluem impostos.</p>

      <h2 className="text-lg font-semibold mt-6">3. Disponibilidade</h2>
      <p>Reservamo-nos o direito de cancelar pedidos em caso de erro de preço, indisponibilidade de estoque ou suspeita de fraude, com devolução integral do valor pago.</p>

      <h2 className="text-lg font-semibold mt-6">4. Propriedade intelectual</h2>
      <p>Todo o conteúdo do site (textos, imagens, marcas) é protegido por direitos autorais. É proibida a reprodução sem autorização.</p>

      <h2 className="text-lg font-semibold mt-6">5. Foro</h2>
      <p>Fica eleito o foro da comarca de São Paulo/SP para dirimir quaisquer questões.</p>
    </LegalPage>
  ),
});
