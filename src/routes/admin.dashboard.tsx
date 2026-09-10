import { useState, useEffect, useCallback, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  TrendingUp,
  CreditCard,
  Users,
  ShoppingCart,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowDownRight,
  MessageCircle,
  Eye,
  Zap,
  Globe,
  RefreshCw,
} from "lucide-react";
import { getDashboard } from "@/utils/analytics.functions";
import type { DashboardMetrics } from "@/utils/analytics.server";
import { AdminShell, GlassCard, formatBRL, formatOrderDate, type DatePresetKey } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin — Dashboard Funil UTMify" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminDashboardPage,
});

const REFRESH_MS = 5_000;

function whatsappOrderLink(name: string | null, phone: string | null, amountCents: number): string {
  const cleanPhone = (phone || "").replace(/\D/g, "");
  const digits = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
  const firstName = (name || "").split(" ")[0] || "tudo bem";
  const msg = `Olá ${firstName}! Aqui é da equipe de atendimento. Vi que o seu pedido no valor de ${formatBRL(
    amountCents
  )} foi gerado no Pix mas ainda não identificamos o pagamento. Quer que eu te envie a chave Pix ou te ajude a finalizar com um desconto especial?`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}

export function AdminDashboardPage() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<"paid" | "pending">("paid");
  const [period, setPeriod] = useState<DatePresetKey>("today");
  const timerRef = useRef<number | null>(null);

  const fetchMetrics = useCallback(async (p: DatePresetKey = period) => {
    setRefreshing(true);
    try {
      const r = await getDashboard({ data: { period: p } });
      if (r.ok) {
        setAuthed(true);
        setMetrics(r.metrics);
        setLastUpdate(new Date());
      } else {
        setAuthed(false);
        setMetrics(null);
      }
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [period]);

  const handlePeriodChange = (newPeriod: DatePresetKey) => {
    setPeriod(newPeriod);
    void fetchMetrics(newPeriod);
  };

  useEffect(() => {
    void fetchMetrics(period);
  }, [period, fetchMetrics]);

  useEffect(() => {
    if (!authed) return;
    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      void fetchMetrics(period);
    };
    timerRef.current = window.setInterval(tick, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void fetchMetrics(period);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [authed, period, fetchMetrics]);

  const f = metrics?.funnel;
  const periodLabel = f?.periodLabel || "Hoje";

  return (
    <AdminShell
      title="Dashboard · Funil UTMify"
      subtitle={`Caminho do lead em tempo real · Período: ${periodLabel} · Atualizado: ${
        lastUpdate ? lastUpdate.toLocaleTimeString("pt-BR") : "—"
      }`}
      authed={authed}
      loading={loading}
      onAuthed={() => void fetchMetrics(period)}
      right={
        <div className="flex items-center flex-wrap gap-2">
          {/* SELETOR DE PERÍODO (Hoje, Ontem, Últimos 7 dias, etc.) */}
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/60 p-1 backdrop-blur-md">
            {(
              [
                ["today", "Hoje"],
                ["yesterday", "Ontem"],
                ["7d", "Últimos 7 dias"],
                ["30d", "Últimos 30 dias"],
                ["all", "Todos"],
              ] as const
            ).map(([key, label]) => {
              const active = period === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePeriodChange(key)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? "border border-[#00f0ff]/60 bg-[#00f0ff]/20 text-[#00f0ff] shadow-[0_0_12px_rgba(0,240,255,0.4)]"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => void fetchMetrics(period)}
            className="admin-btn flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs sm:text-sm text-slate-300 transition cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-[#00f0ff]" : ""}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
      }
    >
      {/* 4 CARDS HERO DE KPI (ESTILO UTMIFY) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {/* Card 1: Faturamento Aprovado */}
        <GlassCard className="relative overflow-hidden border border-[#10b981]/40 shadow-[0_0_25px_-8px_rgba(16,185,129,0.3)]">
          <div className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-[#10b981]/20 blur-2xl" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#10b981]">
              Faturamento ({periodLabel})
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#10b981]/15 border border-[#10b981]/30">
              <CheckCircle2 className="h-4 w-4 text-[#10b981]" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-black text-white tabular-nums tracking-tight">
            {formatBRL(f?.dailyRevenueCents ?? 0)}
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            <span className="rounded-md bg-[#10b981]/15 px-1.5 py-0.5 font-bold text-[#10b981]">
              {f?.dailyPaidCount ?? 0} pedidos pagos
            </span>
            <span>aprovados</span>
          </div>
        </GlassCard>

        {/* Card 2: Pedidos Pendentes */}
        <GlassCard className="relative overflow-hidden border border-[#fcee0a]/40 shadow-[0_0_25px_-8px_rgba(252,238,10,0.25)]">
          <div className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-[#fcee0a]/15 blur-2xl" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#fcee0a]">
              Pedidos Pendentes ({periodLabel})
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#fcee0a]/15 border border-[#fcee0a]/30">
              <Clock className="h-4 w-4 text-[#fcee0a]" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-black text-[#fcee0a] tabular-nums tracking-tight">
            {formatBRL(f?.dailyPendingRevenueCents ?? 0)}
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            <span className="rounded-md bg-[#fcee0a]/15 px-1.5 py-0.5 font-bold text-[#fcee0a]">
              {f?.dailyPendingCount ?? 0} pendentes
            </span>
            <span>recuperação ativa</span>
          </div>
        </GlassCard>

        {/* Card 3: Ticket Médio */}
        <GlassCard className="relative overflow-hidden border border-[#00f0ff]/40 shadow-[0_0_25px_-8px_rgba(0,240,255,0.25)]">
          <div className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-[#00f0ff]/15 blur-2xl" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#00f0ff]">
              Ticket Médio
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#00f0ff]/15 border border-[#00f0ff]/30">
              <TrendingUp className="h-4 w-4 text-[#00f0ff]" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-black text-white tabular-nums tracking-tight">
            {formatBRL(f?.averageTicketCents ?? 0)}
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            <span className="rounded-md bg-[#00f0ff]/15 px-1.5 py-0.5 font-bold text-[#00f0ff]">
              Média / pedido
            </span>
          </div>
        </GlassCard>

        {/* Card 4: Taxa de Conversão do Funil */}
        <GlassCard className="relative overflow-hidden border border-[#ff007f]/40 shadow-[0_0_25px_-8px_rgba(255,0,127,0.25)]">
          <div className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-[#ff007f]/15 blur-2xl" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#ff007f]">
              Conversão Global
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ff007f]/15 border border-[#ff007f]/30">
              <Zap className="h-4 w-4 text-[#ff007f]" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-black text-white tabular-nums tracking-tight">
            {f?.globalConversionRate ?? 0}%
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            <span className="text-slate-300">
              Checkout → Pago: <strong className="text-[#00f0ff]">{f?.checkoutConversionRate ?? 0}%</strong>
            </span>
          </div>
        </GlassCard>
      </div>

      {/* FUNIL COMPLETO DO SITE - ESTILO UTMIFY (CAMINHO DO LEAD) */}
      <GlassCard className="mb-6 overflow-hidden !p-6 border border-[#00f0ff]/30">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#00f0ff] shadow-[0_0_8px_#00f0ff]" />
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
                Funil de Vendas · O Caminho do Lead (UTMify)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Etapas percorridas pelos visitantes desde o anúncio até a conversão aprovada
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-slate-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
            <Eye className="h-3.5 w-3.5 text-[#00f0ff]" />
            <span>{metrics?.live.total ?? 0} ao vivo agora</span>
          </div>
        </div>

        {/* Grade do Funil em 5 Etapas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
          {(f?.stages ?? []).map((stage, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === (f?.stages.length ?? 0) - 1;

            return (
              <div
                key={stage.id}
                className="relative flex flex-col justify-between rounded-xl border border-white/10 bg-[#090d1a]/80 p-4 transition hover:border-[#00f0ff]/50 hover:bg-[#0c1224]"
              >
                <div>
                  {/* Topo da etapa */}
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: `${stage.color}15`,
                        color: stage.color,
                        border: `1px solid ${stage.color}35`,
                      }}
                    >
                      Etapa {idx + 1}
                    </span>

                    {!isFirst && (
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center">
                        ↓ {stage.conversionFromPrev}%
                      </span>
                    )}
                  </div>

                  <h3 className="text-xs sm:text-sm font-black text-white tracking-wide">
                    {stage.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{stage.subtitle}</p>

                  {/* Número de leads */}
                  <div className="my-3">
                    <span className="text-2xl sm:text-3xl font-black text-white tabular-nums">
                      {stage.count.toLocaleString("pt-BR")}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase ml-1.5">leads</span>
                  </div>
                </div>

                {/* Métricas inferiores da etapa */}
                <div>
                  {/* Barra de Progresso com stream animado */}
                  <div className="h-2 w-full rounded-full bg-black/60 overflow-hidden relative border border-white/5 mb-2.5">
                    <div
                      className="h-full rounded-full admin-funnel-stream transition-all duration-1000"
                      style={{
                        width: `${Math.max(8, stage.conversionFromFirst)}%`,
                        backgroundColor: stage.color,
                        boxShadow: `0 0 10px ${stage.color}`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>
                      Total: <strong className="text-white">{stage.conversionFromFirst}%</strong>
                    </span>
                    {!isFirst && !isLast && stage.dropOffRate > 0 && (
                      <span className="text-rose-400 flex items-center">
                        ✕ -{stage.dropOffRate}%
                      </span>
                    )}
                    {isLast && stage.valueCents && (
                      <span className="text-[#10b981] font-bold">
                        {formatBRL(stage.valueCents)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* TABELA DE PEDIDOS: PAGOS VS PENDENTES (COM BOTÃO DE RECUPERAÇÃO NO WHATSAPP) */}
      <GlassCard className="!p-0 overflow-hidden mb-6 border border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-white/10 bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab("paid")}
              className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === "paid"
                  ? "bg-[#10b981]/20 border border-[#10b981]/50 text-[#10b981] shadow-lg shadow-[#10b981]/20"
                  : "bg-white/5 border border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              ✓ Pedidos Pagos ({f?.paidOrders.length ?? 0})
            </button>

            <button
              onClick={() => setActiveTab("pending")}
              className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-2 ${
                activeTab === "pending"
                  ? "bg-[#fcee0a]/20 border border-[#fcee0a]/50 text-[#fcee0a] shadow-lg shadow-[#fcee0a]/20"
                  : "bg-white/5 border border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              ⏳ Pedidos Pendentes ({f?.pendingOrders.length ?? 0})
              <span className="rounded-full bg-[#fcee0a] text-black px-1.5 py-0.2 text-[10px] font-black">
                Recuperar
              </span>
            </button>
          </div>

          <span className="text-xs text-slate-500 font-mono">
            {activeTab === "paid" ? `Transações confirmadas (${periodLabel})` : `Aguardando pagamento Pix (${periodLabel})`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5">Data / Hora</th>
                <th className="px-5 py-3.5">Cliente</th>
                <th className="px-5 py-3.5">Produto</th>
                <th className="px-5 py-3.5">Valor</th>
                <th className="px-5 py-3.5">Origem</th>
                <th className="px-5 py-3.5">Status</th>
                {activeTab === "pending" && <th className="px-5 py-3.5 text-right">Recuperação</th>}
              </tr>
            </thead>
            <tbody>
              {activeTab === "paid" ? (
                (f?.paidOrders.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                      Nenhum pedido pago no período selecionado ({periodLabel}).
                    </td>
                  </tr>
                ) : (
                  f?.paidOrders.map((o) => (
                    <tr key={o.id} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                      <td className="px-5 py-3.5 text-slate-300 font-mono text-xs whitespace-nowrap">
                        <span className="font-semibold text-cyan-300">{formatOrderDate(o.created_at)}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="block font-bold text-white uppercase">{o.customer_name || "Cliente"}</span>
                        <span className="block text-xs text-slate-500 font-mono">{o.customer_cpf || "—"}</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-300 text-xs">
                        {o.product_name}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-white tabular-nums">
                        {formatBRL(o.amount_cents)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-md border border-fuchsia-400/30 bg-fuchsia-400/10 px-2 py-0.5 text-[10px] font-bold text-fuchsia-300 uppercase">
                          {o.traffic_source || "TIKTOK"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-full bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                          Aprovado
                        </span>
                      </td>
                    </tr>
                  ))
                )
              ) : (
                (f?.pendingOrders.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                      Nenhum pedido pendente no período selecionado ({periodLabel}).
                    </td>
                  </tr>
                ) : (
                  f?.pendingOrders.map((o) => (
                    <tr key={o.id} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                      <td className="px-5 py-3.5 text-slate-300 font-mono text-xs whitespace-nowrap">
                        <span className="font-semibold text-amber-300">{formatOrderDate(o.created_at)}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="block font-bold text-white uppercase">{o.customer_name || "Cliente"}</span>
                        <span className="block text-xs text-slate-500 font-mono">
                          {o.customer_phone || o.customer_cpf || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-300 text-xs">
                        {o.product_name}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-[#fcee0a] tabular-nums">
                        {formatBRL(o.amount_cents)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-md border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 text-[10px] font-bold text-sky-300 uppercase">
                          {o.traffic_source || "GOOGLE"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-full bg-amber-950/80 border border-amber-500/40 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                          Aguardando Pix
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {o.customer_phone && (
                          <a
                            href={whatsappOrderLink(o.customer_name, o.customer_phone, o.amount_cents)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#ec4899] to-[#00f0ff] px-3 py-1.5 text-xs font-bold text-white shadow-md hover:opacity-90 transition cursor-pointer"
                          >
                            <MessageCircle className="h-3.5 w-3.5" /> Recuperar no WhatsApp
                          </a>
                        )}
                      </td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* RADAR DE CIDADES */}
      <div className="mt-6">
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-[#00f0ff]" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Geolocalização dos Leads · Cidades Mais Ativas
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">Últimos 30 minutos</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(metrics?.topCities ?? []).slice(0, 8).map((c, i) => (
              <div
                key={`${c.city}-${i}`}
                className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono font-bold text-[#fcee0a]">#{i + 1}</span>
                  <div>
                    <p className="text-xs font-bold text-white">{c.city}</p>
                    <p className="text-[10px] text-slate-400">{c.region || "BR"}</p>
                  </div>
                </div>
                <span className="rounded-full bg-[#00f0ff]/15 px-2 py-0.5 text-xs font-mono font-bold text-[#00f0ff]">
                  {c.count} leads
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </AdminShell>
  );
}

export default AdminDashboardPage;
