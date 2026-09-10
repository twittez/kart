import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Copy, MessageCircle, RefreshCw, Search, Truck, X } from "lucide-react";
import { AdminShell, GlassCard, downloadCsv, formatBRL, formatOrderDate, getPresetDateRange, type DatePresetKey } from "@/components/AdminShell";
import { adminListOrders, adminUpdateLogistics } from "@/utils/admin.functions";
import type { ListedOrder, TrafficSource } from "@/utils/admin.server";

const searchSchema = z.object({
  day: z.string().optional(),
  period: z.enum(["all", "today", "yesterday", "7d", "30d"]).optional(),
  q: z.string().optional(),
  status: z.enum(["all", "paid", "pending", "canceled"]).default("all"),
  source: z.enum(["all", "tiktok", "google", "direct"]).default("all"),
});

export const Route = createFileRoute("/admin/pedidos")({
  validateSearch: (raw: Record<string, unknown>) => searchSchema.parse(raw),
  head: () => ({
    meta: [
      { title: "Admin — Pedidos e status do Pix" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminOrdersPage,
});

const SOURCE_BADGE: Record<TrafficSource, { label: string; cls: string }> = {
  tiktok: { label: "⬛ TIKTOK", cls: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30" },
  google: { label: "🟡 GOOGLE", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  direct: { label: "🌐 DIRETO", cls: "bg-slate-500/15 text-slate-300 border-slate-500/30" },
};

const PERIOD_FILTERS = [
  ["all", "Todo o período"],
  ["today", "Hoje"],
  ["yesterday", "Ontem"],
  ["7d", "Últimos 7 dias"],
  ["30d", "Últimos 30 dias"],
] as const;

const STATUS_FILTERS = [
  ["all", "Todos os status"],
  ["paid", "Apenas pagos"],
  ["pending", "Aguardando Pix"],
  ["canceled", "Cancelados"],
] as const;

const SOURCE_FILTERS = [
  ["all", "Todas as origens"],
  ["tiktok", "TikTok Ads"],
  ["google", "Google Ads"],
  ["direct", "Direto"],
] as const;

const PAID = ["paid", "approved", "succeeded", "completed"];
const isPaid = (s: string) => PAID.includes(String(s).toLowerCase());

function dayRange(day: string): { from: string; to: string } {
  // Interpreta o dia no fuso de São Paulo (UTC-3).
  return { from: `${day}T00:00:00-03:00`, to: `${day}T23:59:59-03:00` };
}

function whatsappLink(order: ListedOrder): string {
  const phone = (order.customer_phone || "").replace(/\D/g, "");
  const digits = phone.startsWith("55") ? phone : `55${phone}`;
  const first = (order.customer_name || "").split(" ")[0] || "tudo bem";
  const msg = isPaid(order.status)
    ? `Olá ${first}! Aqui é da Nova Era. Seu pedido ${order.external_ref} foi confirmado e já está em separação. Qualquer dúvida, é só me chamar por aqui. 😊`
    : `Olá ${first}! Aqui é da Nova Era. Vi que você gerou o Pix de ${formatBRL(order.amount_cents)} do seu pedido e ele ainda está em aberto. Quer que eu envie o código novamente para concluir?`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}

function AdminOrdersPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<ListedOrder[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [term, setTerm] = useState(search.q ?? "");
  const [selected, setSelected] = useState<ListedOrder | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      let range: { from?: string; to?: string } = {};
      if (search.day) {
        range = dayRange(search.day);
      } else if (search.period && search.period !== "all") {
        const pRange = getPresetDateRange(search.period as DatePresetKey);
        range = { from: pRange.from, to: pRange.to };
      }
      const r = await adminListOrders({
        data: {
          q: search.q,
          status: search.status,
          source: search.source,
          ...range,
        },
      });
      if (r.ok) {
        setAuthed(true);
        setOrders(r.orders);
      } else {
        setAuthed(false);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search.day, search.period, search.q, search.status, search.source]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!authed) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 15_000);
    return () => window.clearInterval(id);
  }, [authed, load]);

  const totals = useMemo(() => {
    const paid = orders.filter((o) => isPaid(o.status));
    return {
      count: orders.length,
      paid: paid.length,
      revenue: paid.reduce((s, o) => s + (o.amount_cents ?? 0), 0),
    };
  }, [orders]);

  function exportCsv() {
    downloadCsv(`pedidos-${new Date().toISOString().slice(0, 10)}.csv`, [
      [
        "Data",
        "Status",
        "Valor",
        "Cliente",
        "E-mail",
        "WhatsApp",
        "Cidade",
        "UF",
        "Origem",
        "Campanha",
        "Pix copiado",
        "Rastreio",
        "Ref",
      ],
      ...orders.map((o) => [
        new Date(o.created_at).toLocaleString("pt-BR"),
        o.status,
        (o.amount_cents / 100).toFixed(2).replace(".", ","),
        o.customer_name,
        o.customer_email,
        o.customer_phone,
        o.address_city,
        o.address_state,
        o.source,
        o.utm_campaign,
        o.pix_copied_at ? new Date(o.pix_copied_at).toLocaleString("pt-BR") : "não",
        o.tracking_code,
        o.external_ref,
      ]),
    ]);
  }

  return (
    <AdminShell
      title="Pedidos"
      subtitle={
        search.day
          ? `Pedidos de ${new Date(`${search.day}T12:00:00`).toLocaleDateString("pt-BR")}`
          : search.period && search.period !== "all"
          ? `Pedidos: ${getPresetDateRange(search.period as DatePresetKey).label}`
          : "Busca, filtros, status do Pix e rastreio"
      }
      authed={authed}
      loading={loading}
      onAuthed={() => void load()}
      right={
        <div className="flex items-center gap-2">
          <button
            onClick={() => void load()}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 hover:bg-white/10"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Atualizar
          </button>
          <button
            onClick={exportCsv}
            className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400"
          >
            Exportar CSV
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-5">
        <GlassCard>
          <p className="text-xs uppercase tracking-wider text-slate-500">Pedidos no filtro</p>
          <p className="mt-1 text-2xl font-semibold text-white tabular-nums">{totals.count}</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-wider text-slate-500">Pagos</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-400 tabular-nums">{totals.paid}</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-wider text-slate-500">Faturamento pago</p>
          <p className="mt-1 text-2xl font-semibold text-white tabular-nums">{formatBRL(totals.revenue)}</p>
        </GlassCard>
      </div>

      <GlassCard className="mb-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void navigate({ search: (p) => ({ ...p, q: term || undefined }) });
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Nome, CPF, WhatsApp, e-mail, rastreio, campanha ou ID"
              className="w-full rounded-lg border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-sky-500"
            />
          </div>
          <button className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10">
            Buscar
          </button>
        </form>

        {/* FILTRO DE DATAS RÁPIDAS (Hoje, Ontem, 7 Dias, etc.) */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#00f0ff] mr-1">Data:</span>
          {PERIOD_FILTERS.map(([key, label]) => {
            const active = search.period === key || (!search.period && key === "all" && !search.day);
            return (
              <button
                key={key}
                type="button"
                onClick={() => void navigate({ search: (p) => ({ ...p, period: key, day: undefined }) })}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  active
                    ? "border-[#00f0ff]/50 bg-[#00f0ff]/20 text-[#00f0ff] shadow-[0_0_10px_rgba(0,240,255,0.3)]"
                    : "border-white/10 bg-white/5 text-slate-400 hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            );
          })}
          {search.day && (
            <button
              onClick={() => void navigate({ search: (p) => ({ ...p, day: undefined }) })}
              className="rounded-full border border-amber-500/40 bg-amber-500/20 px-3 py-1.5 text-xs text-amber-200 cursor-pointer"
            >
              Dia {search.day} · limpar ✕
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {STATUS_FILTERS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => void navigate({ search: (p) => ({ ...p, status: key }) })}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                search.status === key
                  ? "border-sky-500/40 bg-sky-500/20 text-sky-200"
                  : "border-white/10 bg-white/5 text-slate-400 hover:text-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {SOURCE_FILTERS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => void navigate({ search: (p) => ({ ...p, source: key }) })}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                search.source === key
                  ? "border-fuchsia-500/40 bg-fuchsia-500/20 text-fuchsia-200"
                  : "border-white/10 bg-white/5 text-slate-400 hover:text-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Pix</th>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">Rastreio</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    Nenhum pedido encontrado com esses filtros.
                  </td>
                </tr>
              )}
              {orders.map((o) => {
                const badge = SOURCE_BADGE[o.source];
                return (
                  <tr key={o.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-300 font-mono text-xs">
                      <span className="font-semibold text-cyan-300">{formatOrderDate(o.created_at)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelected(o)} className="text-left">
                        <span className="block font-medium text-white hover:underline">
                          {o.customer_name || "—"}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {o.address_city ? `${o.address_city}/${o.address_state}` : o.customer_email}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums text-white">
                      {formatBRL(o.amount_cents)}
                    </td>
                    <td className="px-4 py-3">
                      {isPaid(o.status) ? (
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-1 text-xs text-emerald-300">
                          PAGO
                        </span>
                      ) : /cancel|refus|expired/i.test(o.status) ? (
                        <span className="rounded-full border border-rose-500/30 bg-rose-500/15 px-2 py-1 text-xs text-rose-300">
                          CANCELADO
                        </span>
                      ) : (
                        <span className="rounded-full border border-slate-500/30 bg-slate-500/15 px-2 py-1 text-xs text-slate-300">
                          AGUARDANDO
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {o.pix_copied_at ? (
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-1 text-xs text-emerald-300">
                          PIX COPIADO ·{" "}
                          {new Date(o.pix_copied_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      ) : (
                        <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-1 text-xs text-amber-300">
                          NÃO COPIOU PIX
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2 py-1 text-xs ${badge.cls}`}>{badge.label}</span>
                      {o.utm_campaign && (
                        <span className="mt-1 block max-w-[160px] truncate text-xs text-slate-500">
                          {o.utm_campaign}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {o.tracking_code || <span className="text-slate-600">—</span>}
                      {o.logistics_status && (
                        <span className="block text-slate-500">{o.logistics_status}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {o.customer_phone && (
                          <a
                            href={whatsappLink(o)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Falar no WhatsApp"
                            className="rounded-lg border border-emerald-500/30 bg-emerald-500/15 p-2 text-emerald-300 hover:bg-emerald-500/25"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        )}
                        <button
                          onClick={() => setSelected(o)}
                          title="Detalhes e rastreio"
                          className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10"
                        >
                          <Truck className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {selected && (
        <OrderDrawer
          order={selected}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null);
            void load();
          }}
        />
      )}
    </AdminShell>
  );
}

function OrderDrawer({
  order,
  onClose,
  onSaved,
}: {
  order: ListedOrder;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tracking, setTracking] = useState(order.tracking_code ?? "");
  const [status, setStatus] = useState(order.logistics_status ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const r = await adminUpdateLogistics({
        data: { id: order.id, trackingCode: tracking, logisticsStatus: status },
      });
      if (r.ok) onSaved();
      else setMsg(r.error ?? "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  const address = [
    order.address_street,
    order.address_number,
    order.address_complement,
    order.address_neighborhood,
    order.address_city && `${order.address_city}/${order.address_state}`,
    order.address_zipcode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#0d1220] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">{order.customer_name || "Cliente"}</h2>
            <p className="text-xs text-slate-500">{order.external_ref}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-3 text-sm">
          <Field label="Valor" value={formatBRL(order.amount_cents)} />
          <Field label="Produto" value={`${order.product_name}${order.product_color ? ` · ${order.product_color}` : ""}`} />
          <Field label="Status" value={order.status} />
          <Field label="Gateway" value={order.gateway ?? "—"} />
          <Field label="Transação" value={order.transaction_id ?? "—"} />
          <Field label="E-mail" value={order.customer_email ?? "—"} />
          <Field label="WhatsApp" value={order.customer_phone ?? "—"} />
          <Field label="Endereço" value={address || "—"} />
          <Field label="Dispositivo" value={order.device ?? "—"} />
          <Field label="Origem" value={order.source.toUpperCase()} />
          <Field label="Campanha" value={order.utm_campaign ?? "—"} />
          <Field label="Conteúdo/anúncio" value={order.utm_content ?? "—"} />
          <Field
            label="Pix copiado"
            value={order.pix_copied_at ? new Date(order.pix_copied_at).toLocaleString("pt-BR") : "não copiou"}
          />
          <Field label="Criado em" value={new Date(order.created_at).toLocaleString("pt-BR")} />
          {order.paid_at && <Field label="Pago em" value={new Date(order.paid_at).toLocaleString("pt-BR")} />}
        </div>

        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="text-sm font-semibold text-white">Logística</h3>
          <label className="mt-3 block text-xs text-slate-400">Código de rastreio</label>
          <div className="mt-1 flex gap-2">
            <input
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="Ex: AA123456789BR"
              className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
            />
            {tracking && (
              <button
                onClick={() => void navigator.clipboard.writeText(tracking)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 text-slate-300"
                title="Copiar"
              >
                <Copy className="h-4 w-4" />
              </button>
            )}
          </div>
          <label className="mt-3 block text-xs text-slate-400">Status logístico</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
          >
            <option value="">—</option>
            <option value="Em separação">Em separação</option>
            <option value="Postado">Postado</option>
            <option value="Em trânsito">Em trânsito</option>
            <option value="Saiu para entrega">Saiu para entrega</option>
            <option value="Entregue">Entregue</option>
            <option value="Devolvido">Devolvido</option>
          </select>
          {msg && <p className="mt-2 text-sm text-rose-400">{msg}</p>}
          <button
            onClick={() => void save()}
            disabled={saving}
            className="mt-4 w-full rounded-lg bg-sky-500 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-60"
          >
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>

        {order.customer_phone && (
          <a
            href={whatsappLink(order)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/15 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/25"
          >
            <MessageCircle className="h-4 w-4" /> Falar no WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-2">
      <span className="text-xs uppercase tracking-wider text-slate-500">{label}</span>
      <span className="max-w-[60%] break-words text-right text-slate-200">{value}</span>
    </div>
  );
}
