import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw, Send, ShieldCheck, ShieldAlert } from "lucide-react";
import { AdminShell, GlassCard } from "@/components/AdminShell";
import {
  adminIntegrationsStatus,
  adminListOrders,
  adminResendConversions,
} from "@/utils/admin.functions";
import type { IntegrationsStatus } from "@/utils/admin.server";

export const Route = createFileRoute("/admin/integracoes")({
  head: () => ({
    meta: [
      { title: "Admin — Integrações e disparo manual" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminIntegrationsPage,
});

type PaidOrder = {
  id: string;
  customer_name: string | null;
  amount_cents: number;
  created_at: string;
  tt_event_sent: boolean | null;
};

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function AdminIntegrationsPage() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<IntegrationsStatus | null>(null);
  const [orders, setOrders] = useState<PaidOrder[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [st, list] = await Promise.all([
        adminIntegrationsStatus(),
        adminListOrders({ data: { status: "paid" } }),
      ]);
      if (st.ok) {
        setAuthed(true);
        setStatus(st.status);
      } else {
        setAuthed(false);
      }
      if (list.ok) setOrders((list.orders as unknown as PaidOrder[]).slice(0, 30));
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function resend(id: string) {
    setSendingId(id);
    setMessage(null);
    try {
      const r = await adminResendConversions({ data: { orderId: id } });
      setMessage(
        r.ok
          ? `Conversão reenviada — TikTok: ${"tiktok" in r && r.tiktok ? "ok" : "falhou"}`
          : "Não foi possível reenviar agora."
      );
      await load();
    } finally {
      setSendingId(null);
    }
  }

  return (
    <AdminShell
      title="Integrações"
      subtitle="Situação dos pixels e reenvio manual de conversões"
      authed={authed}
      loading={loading}
      onAuthed={() => void load()}
      right={
        <button
          onClick={() => void load()}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 hover:bg-white/10"
        >
          <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /> Atualizar
        </button>
      }
    >
      {message && (
        <div className="mb-4 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-200">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <GlassCard>
          <p className="text-xs uppercase tracking-wide text-slate-400">TikTok</p>
          <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-white">
            {status?.tiktokPixelConfigured ? (
              <>
                <ShieldCheck className="h-5 w-5 text-emerald-400" /> Ativo
              </>
            ) : (
              <>
                <ShieldAlert className="h-5 w-5 text-amber-400" /> Sem configuração
              </>
            )}
          </p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-wide text-slate-400">Gateway ativo</p>
          <p className="mt-2 text-lg font-semibold uppercase text-white">
            {status?.activeGateway ?? "—"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Reserva: {status?.fallbackGateways.length ? status.fallbackGateways.join(", ") : "nenhuma"}
          </p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-wide text-slate-400">Conversões pendentes</p>
          <p className="mt-2 text-lg font-semibold text-white">{status?.pendingConversions ?? 0}</p>
          <p className="mt-1 text-xs text-slate-400">Vendas pagas sem confirmação de envio</p>
        </GlassCard>
      </div>

      <GlassCard className="mt-5">
        <h3 className="text-sm font-semibold text-white">Últimas vendas pagas</h3>
        <p className="mt-1 text-xs text-slate-400">
          Use o reenvio somente se o anúncio não registrou a venda — o envio é identificado, então
          não gera venda duplicada nos painéis.
        </p>
        <div className="mt-4 space-y-2">
          {orders.length === 0 && (
            <p className="text-sm text-slate-400">Nenhuma venda paga no período.</p>
          )}
          {orders.map((o) => (
            <div
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  {o.customer_name || "Cliente"}
                </p>
                <p className="text-xs text-slate-400">
                  {new Date(o.created_at).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })}{" "}
                  · {brl(o.amount_cents)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    o.tt_event_sent
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-amber-500/20 text-amber-300"
                  }`}
                >
                  TIKTOK
                </span>
                <button
                  disabled={sendingId === o.id}
                  onClick={() => void resend(o.id)}
                  className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-400 disabled:opacity-60"
                >
                  <Send className="h-3.5 w-3.5" />
                  {sendingId === o.id ? "Enviando…" : "Reenviar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </AdminShell>
  );
}
