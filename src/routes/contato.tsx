import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Contato — Nova Era" },
      { name: "description", content: "Fale conosco. Atendimento de segunda a sexta, das 9h às 18h." },
    ],
  }),
  component: () => (
    <LegalPage title="Contato">
      <p>Estamos prontos para ajudar! Entre em contato pelos canais abaixo:</p>

      <h2 className="text-lg font-semibold mt-6">📧 E-mail</h2>
      <p><a href="mailto:re.novaera@gmail.com" className="text-[#3483fa] hover:underline">re.novaera@gmail.com</a></p>

      <h2 className="text-lg font-semibold mt-6">📞 Telefone</h2>
      <p>(53) 3242-3133</p>

      <h2 className="text-lg font-semibold mt-6">🕐 Horário de atendimento</h2>
      <p>Segunda a Sexta: 9h às 18h<br/>Sábados: 9h às 13h<br/>Domingos e feriados: fechado</p>

      <h2 className="text-lg font-semibold mt-6">🏢 Dados da empresa</h2>
      <p>
        NOVA ERA BRINQUEDOS LTDA<br/>
        CNPJ: 97.083.380/0001-07<br/>
        Av. General Osório, 1139 — Centro, Bagé — RS, CEP 96400-100
      </p>

      <p className="mt-6 text-sm text-gray-600">Tempo médio de resposta: 24 horas úteis.</p>
    </LegalPage>
  ),
});
