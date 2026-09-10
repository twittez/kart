import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, GlassCard, formatBRL, downloadCsv } from "@/components/AdminShell";
import { adminListOrders, adminUpdateLogistics } from "@/utils/admin.functions";
import { buildCycle, PHASE_LABEL, type TrackingPhase } from "@/lib/tracking-cycle";
import { trackingCodeFor } from "@/lib/tracking.functions";
import { Copy, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/admin/rastreio")({
  head: () => ({
    meta: [
      { title: "Admin — Rastreio e logística" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminTrackingPage,
});

type Order = {
  id: string;
  created_at: string;
  paid_at: string | null;
  status: string;
  amount_cents: number;
  product_name: string;
  customer_name: string | null;
  customer_email: string | null;
  address_city: string | null;
  address_state: string | null;
  external_ref: string;
  tracking_code: string | null;
};

const PHASE_TONE: Record<TrackingPhase, string> = {
  aguardando_pagamento: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  separacao: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  em_transporte: "border-indigo-500/30 bg-indigo-500/10 text-indigo-300",
  entregue: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
};

function AdminTrackingPage() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [q, setQ] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<"all" | TrackingPhase>("all");

  const load = useCallback(async () => {
    const r = await adminListOrders({ data: { q, status: "all", source: "all" } });
    if (r.ok) {
      setAuthed(true);
      setOrders((r.orders ?? []) as unknown as Order[]);
    } else {
      setAuthed(false);
    }
    setLoading(false);
  }, [q]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    return orders
      .map((o) => {
        const code = o.tracking_code || trackingCodeFor(o.external_ref || o.id);
        const cycle = buildCycle(o.paid_at, code);
        return { o, code, cycle };
      })
      .filter((r) => phaseFilter === "all" || r.cycle.phase === phaseFilter);
  }, [orders, phaseFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const o of orders) {
      const code = o.tracking_code || trackingCodeFor(o.external_ref || o.id);
      const p = buildCycle(o.paid_at, code).phase;
      c[p] = (c[p] ?? 0) + 1;
    }
    return c;
  }, [orders]);

  const fmtDate = (v?: string | null) =>
    v ? new Date(v).toLocaleDateString("pt-BR") : "—";

  async function saveCode(id: string, code: string) {
    await adminUpdateLogistics({ data: { id, trackingCode: code } });
    await load();
  }

  return (
    <AdminShell
      title="Rastreio e logística"
      subtitle="Ciclo: 1 dia útil em separação, 8 a 12 dias úteis em transporte, entrega ao vizinho"
      authed={authed}
      loading={loading}
      onAuthed={() => void load()}
      right={
        <div className="flex gap-2">
          <button
            onClick={() => void load()}
            className="admin-btn flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-slate-300"
          >
            <RefreshCw className="h-4 w-4" /> Atualizar
          </button>
          <button
            onClick={() =>
              downloadCsv(
                "rastreio.csv",
                [
                  ["Código", "Pedido", "Cliente", "Cidade", "Fase", "Pago em", "Previsão", "Valor"],
                  ...rows.map((r) => [
                    r.code,
                    r.o.external_ref,
                    r.o.customer_name,
                    r.o.address_city ? `${r.o.address_city}/${r.o.address_state}` : "",
                    PHASE_LABEL[r.cycle.phase],
                    fmtDate(r.o.paid_at),
                    fmtDate(r.cycle.deliveryEstimateAt || null),
                    formatBRL(r.o.amount_cents),
                  ]),
                ],
              )
            }
            className="admin-btn rounded-xl px-4 py-2 text-sm text-slate-300"
          >
            Exportar CSV
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          ["aguardando_pagamento", "separacao", "em_transporte", "entregue"] as TrackingPhase[]
        ).map((p) => (
          <GlassCard key={p}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              {PHASE_LABEL[p]}
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-white">
              {counts[p] ?? 0}
            </p>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por código, cliente, e-mail ou pedido"
            className="min-w-[240px] flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-sky-500/60"
          />
          <select
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value as typeof phaseFilter)}
            className="rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-sky-500/60"
          >
            <option value="all">Todas as fases</option>
            <option value="aguardando_pagamento">Aguardando pagamento</option>
            <option value="separacao">Em separação</option>
            <option value="em_transporte">Em transporte</option>
            <option value="entregue">Entregue ao vizinho</option>
          </select>
        </div>
      </GlassCard>

      <div className="mt-4 space-y-3">
        {rows.length === 0 && (
          <GlassCard>
            <p className="text-sm text-slate-400">Nenhum pedido nesta fase.</p>
          </GlassCard>
        )}
        {rows.map(({ o, code, cycle }) => (
          <GlassCard key={o.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm font-semibold text-sky-200">{code}</p>
                  <button
                    onClick={() => void navigator.clipboard.writeText(code)}
                    title="Copiar código"
                    className="text-slate-500 transition hover:text-sky-300"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  {!o.tracking_code && (
                    <button
                      onClick={() => void saveCode(o.id, code)}
                      className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-400 hover:text-sky-300"
                    >
                      Salvar no pedido
                    </button>
                  )}
                </div>
                <p className="mt-1 truncate text-sm text-slate-200">
                  {o.customer_name ?? "—"}{" "}
                  <span className="text-slate-500">· {o.customer_email ?? "—"}</span>
                </p>
                <p className="text-xs text-slate-500">
                  {o.product_name} ·{" "}
                  {o.address_city ? `${o.address_city}/${o.address_state}` : "sem endereço"} ·{" "}
                  {formatBRL(o.amount_cents)}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`inline-block rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${PHASE_TONE[cycle.phase]}`}
                >
                  {PHASE_LABEL[cycle.phase]}
                </span>
                <p className="mt-2 text-xs text-slate-400">
                  Pago: {fmtDate(o.paid_at)}
                </p>
                <p className="text-xs text-slate-400">
                  Previsão: {fmtDate(cycle.deliveryEstimateAt || null)}
                </p>
                {cycle.phase !== "aguardando_pagamento" && (
                  <p className="text-[11px] text-slate-500">
                    transporte de {cycle.transitBusinessDays} dias úteis
                  </p>
                )}
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </AdminShell>
  );
}
