import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/politica-de-reembolso")({
  head: () => ({
    meta: [
      { title: "Política de Reembolso e Trocas — Nova Era" },
      { name: "description", content: "Conheça nossa política de devolução, troca e reembolso." },
    ],
  }),
  component: () => (
    <LegalPage title="Política de Reembolso e Trocas">
      <p><strong>Última atualização:</strong> {new Date().toLocaleDateString("pt-BR")}</p>

      <h2 className="text-lg font-semibold mt-6">1. Direito de arrependimento</h2>
      <p>Conforme o art. 49 do CDC, você tem até <strong>7 dias corridos</strong> a partir do recebimento do produto para desistir da compra, sem necessidade de justificativa.</p>

      <h2 className="text-lg font-semibold mt-6">2. Defeitos de fabricação</h2>
      <p>Em caso de defeito, você tem até <strong>90 dias</strong> para solicitar troca ou reembolso. O produto deve estar acompanhado da nota fiscal.</p>

      <h2 className="text-lg font-semibold mt-6">3. Como solicitar</h2>
      <p>Envie um e-mail para re.novaera@gmail.com com o número do pedido, motivo e fotos do produto. Responderemos em até 48h úteis com as instruções.</p>

      <h2 className="text-lg font-semibold mt-6">4. Prazo de reembolso</h2>
      <p>Após o recebimento e análise do produto devolvido, o reembolso será processado em até <strong>10 dias úteis</strong> via PIX ou estorno na forma original de pagamento.</p>

      <h2 className="text-lg font-semibold mt-6">5. Condições</h2>
      <p>O produto deve estar em sua embalagem original, sem sinais de uso, com todos os acessórios e manuais.</p>
    </LegalPage>
  ),
});
