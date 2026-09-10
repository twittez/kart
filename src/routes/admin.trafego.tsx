import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { AdminShell, GlassCard, downloadCsv, formatBRL } from "@/components/AdminShell";
import { adminTrafficReport } from "@/utils/admin.functions";
import type { TrafficReport } from "@/utils/admin.server";

export const Route = createFileRoute("/admin/trafego")({
  head: () => ({
    meta: [
      { title: "Admin — Inteligência de tráfego" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminTrafficPage,
});

const TZ = "America/Sao_Paulo";
function dayKey(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}
function shift(days: number): string {
  return dayKey(new Date(Date.now() + days * 86_400_000));
}
function iso(day: string, end = false): string {
  return `${day}T${end ? "23:59:59" : "00:00:00"}-03:00`;
}

type PresetKey =
  | "all"
  | "today"
  | "yesterday"
  | "7d"
  | "14d"
  | "30d"
  | "month"
  | "lastMonth"
  | "custom";

const PRESETS: [PresetKey, string][] = [
  ["all", "Todo o período"],
  ["today", "Hoje"],
  ["yesterday", "Ontem"],
  ["7d", "Últimos 7 dias"],
  ["14d", "Últimos 14 dias"],
  ["30d", "Últimos 30 dias"],
  ["month", "Este mês"],
  ["lastMonth", "Mês passado"],
];

function presetRange(key: PresetKey): { from?: string; to?: string } {
  const now = new Date();
  const y = Number(dayKey(now).slice(0, 4));
  const m = Number(dayKey(now).slice(5, 7));
  const pad = (n: number) => String(n).padStart(2, "0");
  switch (key) {
    case "today":
      return { from: iso(shift(0)), to: iso(shift(0), true) };
    case "yesterday":
      return { from: iso(shift(-1)), to: iso(shift(-1), true) };
    case "7d":
      return { from: iso(shift(-6)), to: iso(shift(0), true) };
    case "14d":
      return { from: iso(shift(-13)), to: iso(shift(0), true) };
    case "30d":
      return { from: iso(shift(-29)), to: iso(shift(0), true) };
    case "month":
      return { from: iso(`${y}-${pad(m)}-01`), to: iso(shift(0), true) };
    case "lastMonth": {
      const lm = m === 1 ? 12 : m - 1;
      const ly = m === 1 ? y - 1 : y;
      const lastDay = new Date(Date.UTC(ly, lm, 0)).getUTCDate();
      return { from: iso(`${ly}-${pad(lm)}-01`), to: iso(`${ly}-${pad(lm)}-${pad(lastDay)}`, true) };
    }
    default:
      return {};
  }
}

function AdminTrafficPage() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [report, setReport] = useState<TrafficReport | null>(null);
  const [preset, setPreset] = useState<PresetKey>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const range = useMemo(() => {
    if (preset === "custom") {
      return {
        from: customFrom ? iso(customFrom) : undefined,
        to: customTo ? iso(customTo, true) : undefined,
      };
    }
    return presetRange(preset);
  }, [preset, customFrom, customTo]);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const r = await adminTrafficReport({ data: range });
      if (r.ok) {
        setAuthed(true);
        setReport(r.report);
      } else {
        setAuthed(false);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range]);

  useEffect(() => {
    void load();
  }, [load]);

  const today = dayKey(new Date());
  const yesterday = shift(-1);

  function exportDaily() {
    if (!report) return;
    downloadCsv(`vendas-diarias-${today}.csv`, [
      [
        "Data",
        "TikTok R$",
        "TikTok vendas",
        "Direto R$",
        "Direto vendas",
        "Total R$",
        "Total vendas",
      ],
      ...report.daily.map((d) => [
        d.date,
        (d.tiktok.revenueCents / 100).toFixed(2).replace(".", ","),
        d.tiktok.paidCount,
        (d.direct.revenueCents / 100).toFixed(2).replace(".", ","),
        d.direct.paidCount,
        (d.totalRevenueCents / 100).toFixed(2).replace(".", ","),
        d.totalPaid,
      ]),
    ]);
  }

  const footer = useMemo(() => {
    const d = report?.daily ?? [];
    return {
      tiktok: d.reduce((s, r) => s + r.tiktok.revenueCents, 0),
      tiktokC: d.reduce((s, r) => s + r.tiktok.paidCount, 0),
      direct: d.reduce((s, r) => s + r.direct.revenueCents, 0),
      directC: d.reduce((s, r) => s + r.direct.paidCount, 0),
      total: d.reduce((s, r) => s + r.totalRevenueCents, 0),
      totalC: d.reduce((s, r) => s + r.totalPaid, 0),
    };
  }, [report]);

  return (
    <AdminShell
      title="Inteligência de tráfego"
      subtitle="TikTok Ads, vendas dia a dia e melhores campanhas"
      authed={authed}
      loading={loading}
      onAuthed={() => void load()}
      right={
        <button
          onClick={() => void load()}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 hover:bg-white/10"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Atualizar
        </button>
      }
    >
      {/* Filtros de data */}
      <GlassCard className="mb-5">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPreset(key)}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                preset === key
                  ? "border-sky-500/40 bg-sky-500/20 text-sky-200"
                  : "border-white/10 bg-white/5 text-slate-400 hover:text-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-slate-500">De:</label>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => {
                setCustomFrom(e.target.value);
                setPreset("custom");
              }}
              className="mt-1 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-white outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500">Até:</label>
            <input
              type="date"
              value={customTo}
              onChange={(e) => {
                setCustomTo(e.target.value);
                setPreset("custom");
              }}
              className="mt-1 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-white outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </GlassCard>

      {/* Cards executivos */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mb-6">
        <SourceCard
          title="⬛ TikTok Ads"
          accent="from-fuchsia-500/20"
          stats={report?.bySource.tiktok}
        />
        <GlassCard className="bg-gradient-to-br from-emerald-500/15 to-transparent">
          <p className="text-sm font-semibold text-white">✅ Total geral aprovado</p>
          <p className="mt-3 text-3xl font-bold text-white tabular-nums">
            {formatBRL(report?.total.revenueCents ?? 0)}
          </p>
          <p className="text-sm text-slate-400">{report?.total.paidCount ?? 0} vendas pagas</p>
          <div className="mt-4">
            <ShareBar tiktok={report?.total.tiktokShare ?? 0} />
            <p className="mt-2 text-xs text-slate-400">
              TikTok {(report?.total.tiktokShare ?? 0).toFixed(1)}%
            </p>
          </div>
        </GlassCard>
      </div>

      {/* Vendas diárias */}
      <GlassCard className="!p-0 mb-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
          <div>
            <h2 className="text-sm font-semibold text-white">Vendas diárias por origem</h2>
            <p className="text-xs text-slate-500">Somente pedidos pagos, no fuso de São Paulo</p>
          </div>
          <button
            onClick={exportDaily}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10"
          >
            Exportar vendas diárias (CSV)
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Dia</th>
                <th className="px-4 py-3">TikTok Ads</th>
                <th className="px-4 py-3">Direto</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3 w-40">Share</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {(report?.daily ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    Sem vendas pagas no período.
                  </td>
                </tr>
              )}
              {(report?.daily ?? []).map((d) => {
                const base = d.totalRevenueCents;
                const ttPct = base > 0 ? (d.tiktok.revenueCents / base) * 100 : 0;
                return (
                  <tr key={d.date} className="border-b border-white/5 hover:bg-white/[0.03]">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-white">
                        {new Date(`${d.date}T12:00:00`).toLocaleDateString("pt-BR")}
                      </span>
                      {d.date === today && (
                        <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                          HOJE
                        </span>
                      )}
                      {d.date === yesterday && (
                        <span className="ml-2 rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                          ONTEM
                        </span>
                      )}
                    </td>
                    <Cell cents={d.tiktok.revenueCents} count={d.tiktok.paidCount} />
                    <Cell cents={d.direct.revenueCents} count={d.direct.paidCount} />
                    <Cell cents={d.totalRevenueCents} count={d.totalPaid} strong />
                    <td className="px-4 py-3">
                      <ShareBar tiktok={ttPct} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to="/admin/pedidos"
                        search={{ day: d.date, status: "all", source: "all" }}
                        className="whitespace-nowrap rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
                      >
                        Ver pedidos
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {(report?.daily ?? []).length > 0 && (
              <tfoot>
                <tr className="border-t border-white/10 bg-white/[0.04] text-sm font-semibold text-white">
                  <td className="px-4 py-3">Total do período</td>
                  <Cell cents={footer.tiktok} count={footer.tiktokC} strong />
                  <Cell cents={footer.direct} count={footer.directC} strong />
                  <Cell cents={footer.total} count={footer.totalC} strong />
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </GlassCard>

      {/* Ranking de campanhas */}
      <div className="grid grid-cols-1 gap-4">
        <CampaignRank title="⬛ Melhores campanhas TikTok" rows={report?.campaigns.tiktok ?? []} />
      </div>
    </AdminShell>
  );
}

function Cell({ cents, count, strong }: { cents: number; count: number; strong?: boolean }) {
  return (
    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
      <span className={strong ? "text-white" : "text-slate-200"}>{formatBRL(cents)}</span>
      <span className="block text-xs text-slate-500">{count} vendas</span>
    </td>
  );
}

function ShareBar({ tiktok }: { tiktok: number }) {
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div className="bg-fuchsia-500" style={{ width: `${tiktok}%` }} />
    </div>
  );
}

function SourceCard({
  title,
  accent,
  stats,
}: {
  title: string;
  accent: string;
  stats?: { revenueCents: number; paidCount: number; ticketCents: number; pixConversion: number; pendingCount: number };
}) {
  return (
    <GlassCard className={`bg-gradient-to-br ${accent} to-transparent`}>
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-3 text-3xl font-bold text-white tabular-nums">{formatBRL(stats?.revenueCents ?? 0)}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Metric label="Pedidos pagos" value={String(stats?.paidCount ?? 0)} />
        <Metric label="Ticket médio" value={formatBRL(stats?.ticketCents ?? 0)} />
        <Metric label="Conversão Pix" value={`${(stats?.pixConversion ?? 0).toFixed(1)}%`} />
        <Metric label="Pendentes" value={String(stats?.pendingCount ?? 0)} />
      </div>
    </GlassCard>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 font-semibold text-slate-100 tabular-nums">{value}</p>
    </div>
  );
}

function CampaignRank({
  title,
  rows,
}: {
  title: string;
  rows: { campaign: string; revenueCents: number; paidCount: number; ticketCents: number }[];
}) {
  return (
    <GlassCard>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Sem vendas pagas atribuídas no período.</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {rows.map((c, i) => (
            <li key={c.campaign} className="flex items-center gap-3 border-b border-white/5 pb-2">
              <span className="w-4 text-right text-xs text-slate-500">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-slate-100">{c.campaign}</p>
                <p className="text-xs text-slate-500">
                  {c.paidCount} vendas · ticket {formatBRL(c.ticketCents)}
                </p>
              </div>
              <span className="whitespace-nowrap text-sm font-semibold text-white tabular-nums">
                {formatBRL(c.revenueCents)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </GlassCard>
  );
}
