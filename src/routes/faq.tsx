import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "Perguntas Frequentes — Nova Era" },
      { name: "description", content: "Respostas para as dúvidas mais comuns sobre compras, envio e produtos." },
    ],
  }),
  component: () => (
    <LegalPage title="Perguntas Frequentes">
      <h2 className="text-lg font-semibold mt-4">Como funciona o pagamento via PIX?</h2>
      <p>Após preencher os dados, geramos um QR Code PIX. O pagamento é confirmado em segundos e seu pedido é processado automaticamente.</p>

      <h2 className="text-lg font-semibold mt-6">Qual o prazo de entrega?</h2>
      <p>Frete grátis: entrega estimada em 5 a 8 dias úteis após a confirmação do pagamento. Regiões remotas podem ter prazo maior.</p>

      <h2 className="text-lg font-semibold mt-6">Recebo nota fiscal?</h2>
      <p>Sim, todos os pedidos são acompanhados de nota fiscal eletrônica enviada por e-mail.</p>

      <h2 className="text-lg font-semibold mt-6">Tem garantia?</h2>
      <p>Sim: 3 meses de garantia de fábrica contra defeitos de fabricação. Durante o checkout é possível contratar uma extensão de garantia opcional.</p>

      <h2 className="text-lg font-semibold mt-6">Posso trocar ou devolver?</h2>
      <p>Sim. Você tem 7 dias corridos de direito de arrependimento a partir do recebimento e 3 meses de garantia para defeitos de fabricação. Veja a <a href="/politica-de-reembolso" className="text-[#3483fa] hover:underline">Política de Reembolso</a>.</p>

      <h2 className="text-lg font-semibold mt-6">O site é seguro?</h2>
      <p>Sim. Usamos criptografia SSL e seus dados de pagamento são processados por gateway certificado.</p>

      <h2 className="text-lg font-semibold mt-6">Como rastreio meu pedido?</h2>
      <p>Você recebe o código de rastreio por e-mail assim que o pedido é postado.</p>
    </LegalPage>
  ),
});
