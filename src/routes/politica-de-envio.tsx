import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/politica-de-envio")({
  head: () => ({
    meta: [
      { title: "Política de Envio e Entrega — Nova Era" },
      { name: "description", content: "Prazos, modalidades e custos de envio para todo o Brasil." },
    ],
  }),
  component: () => (
    <LegalPage title="Política de Envio e Entrega">
      <p><strong>Última atualização:</strong> {new Date().toLocaleDateString("pt-BR")}</p>

      <h2 className="text-lg font-semibold mt-6">1. Modalidades de envio</h2>
      <ul className="list-disc pl-6 space-y-2">
        <li><strong>Frete Grátis:</strong> entrega em 5 a 8 dias úteis para todo o Brasil.</li>
        <li><strong>Sedex 24h:</strong> entrega em até 24 horas úteis após postagem (capitais e regiões metropolitanas).</li>
      </ul>

      <h2 className="text-lg font-semibold mt-6">2. Prazo de postagem</h2>
      <p>Pedidos com pagamento aprovado até as 14h são postados no mesmo dia útil. Após esse horário, no próximo dia útil.</p>

      <h2 className="text-lg font-semibold mt-6">3. Rastreamento</h2>
      <p>Você receberá o código de rastreio por e-mail assim que o pedido for postado.</p>

      <h2 className="text-lg font-semibold mt-6">4. Áreas de entrega</h2>
      <p>Entregamos em todo o território nacional. Para regiões remotas, o prazo pode ser estendido.</p>

      <h2 className="text-lg font-semibold mt-6">5. Tentativas de entrega</h2>
      <p>São realizadas até 3 tentativas. Após isso, o produto retorna ao remetente e o cliente arca com o reenvio.</p>
    </LegalPage>
  ),
});
