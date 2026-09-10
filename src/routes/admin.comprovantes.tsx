import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, RefreshCw, X } from "lucide-react";
import { AdminShell, GlassCard, formatBRL } from "@/components/AdminShell";
import { adminApproveProof, adminListProofs, adminRejectProof } from "@/utils/admin.functions";
import type { PaymentProof } from "@/utils/proofs.server";

export const Route = createFileRoute("/admin/comprovantes")({
  head: () => ({
    meta: [
      { title: "Admin — Comprovantes de pagamento" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminProofsPage,
});

type StatusFilter = "pending" | "approved" | "rejected" | "all";
const FILTERS: [StatusFilter, string][] = [
  ["pending", "Aguardando análise"],
  ["approved", "Aprovados"],
  ["rejected", "Recusados"],
  ["all", "Todos"],
];

function AdminProofsPage() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<PaymentProof | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const r = await adminListProofs({ data: { status } });
      if (r.ok) {
        setAuthed(true);
        setProofs(r.proofs);
      } else {
        setAuthed(false);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  // Atualiza sozinho a cada 20s para não perder comprovante novo.
  useEffect(() => {
    if (!authed) return;
    const id = window.setInterval(() => void load(), 20_000);
    return () => window.clearInterval(id);
  }, [authed, load]);

  async function approve(p: PaymentProof) {
    setBusyId(p.id);
    try {
      const r = await adminApproveProof({ data: { id: p.id } });
      setToast(
        r.ok
          ? "converted" in r && r.converted
            ? "Aprovado: pedido marcado como pago e conversão enviada para Meta e TikTok."
            : "Aprovado: pedido marcado como pago."
          : "Não foi possível aprovar."
      );
      await load();
    } finally {
      setBusyId(null);
      setTimeout(() => setToast(null), 4000);
    }
  }

  async function reject(p: PaymentProof) {
    setBusyId(p.id);
    try {
      await adminRejectProof({ data: { id: p.id } });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell
      title="Comprovantes de pagamento"
      subtitle="Aprovar libera o pedido como pago e dispara a conversão nos pixels"
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
      {toast && (
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {toast}
        </div>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setStatus(key)}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${
              status === key
                ? "border-sky-500/40 bg-sky-500/20 text-sky-200"
                : "border-white/10 bg-white/5 text-slate-400 hover:text-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {proofs.length === 0 ? (
        <GlassCard>
          <p className="text-sm text-slate-400">
            Nenhum comprovante nesta situação. Quando um cliente enviar a foto do pagamento na tela
            do Pix, ele aparece aqui na hora.
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {proofs.map((p) => (
            <GlassCard key={p.id} className="!p-0 overflow-hidden">
              <button
                onClick={() => setZoom(p)}
                className="block w-full bg-black/40"
                title="Ampliar comprovante"
              >
                <img
                  src={p.image_data}
                  alt={`Comprovante enviado por ${p.customer_name ?? "cliente"}`}
                  className="h-56 w-full object-contain"
                />
              </button>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {p.customer_name || "Cliente não identificado"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(p.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-sm font-semibold text-white tabular-nums">
                    {formatBRL(p.amount_cents ?? 0)}
                  </span>
                </div>
                <p className="mt-2 truncate text-xs text-slate-500">
                  {p.customer_phone || "sem telefone"} · {p.transaction_id || "sem transação"}
                </p>

                {p.status === "pending" ? (
                  <div className="mt-4 flex gap-2">
                    <button
                      disabled={busyId === p.id}
                      onClick={() => void approve(p)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-400 disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" /> Aprovar
                    </button>
                    <button
                      disabled={busyId === p.id}
                      onClick={() => void reject(p)}
                      className="flex items-center justify-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" /> Recusar
                    </button>
                  </div>
                ) : (
                  <p
                    className={`mt-4 rounded-lg px-3 py-2 text-center text-xs font-semibold ${
                      p.status === "approved"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-rose-500/15 text-rose-300"
                    }`}
                  >
                    {p.status === "approved" ? "Aprovado" : "Recusado"}
                    {p.reviewed_at && ` · ${new Date(p.reviewed_at).toLocaleString("pt-BR")}`}
                  </p>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {zoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZoom(null)}
        >
          <img
            src={zoom.image_data}
            alt="Comprovante ampliado"
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </AdminShell>
  );
}
