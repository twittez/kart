import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/politica-de-privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Nova Era" },
      { name: "description", content: "Como coletamos, usamos e protegemos seus dados pessoais." },
    ],
  }),
  component: () => (
    <LegalPage title="Política de Privacidade">
      <p><strong>Última atualização:</strong> {new Date().toLocaleDateString("pt-BR")}</p>
      <p>A Nova Era ("nós") respeita sua privacidade e está comprometida em proteger seus dados pessoais conforme a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).</p>

      <h2 className="text-lg font-semibold mt-6">1. Dados que coletamos</h2>
      <p>Coletamos os seguintes dados quando você realiza uma compra: nome completo, CPF, e-mail, telefone, endereço de entrega e CEP. Também coletamos dados de navegação como cookies e endereço IP.</p>

      <h2 className="text-lg font-semibold mt-6">2. Como usamos seus dados</h2>
      <p>Seus dados são usados exclusivamente para: processar pedidos e pagamentos, realizar a entrega, emitir nota fiscal, oferecer suporte ao cliente e cumprir obrigações legais.</p>

      <h2 className="text-lg font-semibold mt-6">3. Compartilhamento</h2>
      <p>Compartilhamos dados apenas com: transportadoras (para entrega), processadores de pagamento (PIX/cartão) e órgãos públicos quando exigido por lei. Não vendemos seus dados.</p>

      <h2 className="text-lg font-semibold mt-6">4. Seus direitos</h2>
      <p>Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento pelo e-mail re.novaera@gmail.com.</p>

      <h2 className="text-lg font-semibold mt-6">5. Segurança</h2>
      <p>Utilizamos criptografia SSL e medidas técnicas para proteger seus dados contra acesso não autorizado.</p>

      <h2 className="text-lg font-semibold mt-6">6. Contato</h2>
      <p>Dúvidas sobre privacidade: re.novaera@gmail.com</p>
    </LegalPage>
  ),
});
