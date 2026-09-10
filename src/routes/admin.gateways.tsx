import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, RefreshCw } from "lucide-react";
import { AdminShell, GlassCard } from "@/components/AdminShell";
import { adminGetGateways, adminSetGateways, adminTestPix } from "@/utils/admin.functions";

export const Route = createFileRoute("/admin/gateways")({
  head: () => ({
    meta: [
      { title: "Admin — Gateways de pagamento" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminGatewaysPage,
});

type G = "axxon" | "winner" | "primecash";
const ALL: { key: G; label: string; note: string }[] = [
  { key: "axxon", label: "Axxon Pay", note: "Pix direto, confirmação por postback" },
  { key: "winner", label: "Winner Pay", note: "Pix direto, confirmação por webhook" },
  { key: "primecash", label: "PrimeCash", note: "Pix direto, confirmação por webhook" },
];

function AdminGatewaysPage() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState<G>("axxon");
  const [fallback, setFallback] = useState<G[]>([]);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState<G | null>(null);
  const [testResult, setTestResult] = useState<{ gateway: G; ok: boolean; text: string } | null>(null);

  async function runTest(g: G) {
    setTesting(g);
    setTestResult(null);
    try {
      const r = await adminTestPix({ data: { gateway: g } });
      setTestResult(
        r.ok
          ? { gateway: g, ok: true, text: `Pix de teste de R$ 6,00 gerado. Código: ${r.qrCode}` }
          : { gateway: g, ok: false, text: r.error || "Falha no teste" }
      );
    } catch {
      setTestResult({ gateway: g, ok: false, text: "Falha ao contatar o gateway." });
    } finally {
      setTesting(null);
    }
  }

  const load = useCallback(async () => {
    const r = await adminGetGateways();
    if (r.ok) {
      setAuthed(true);
      setActive(r.settings.active as G);
      setFallback(r.settings.fallback as G[]);
    } else {
      setAuthed(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(nextActive: G, nextFallback: G[]) {
    setSaving(true);
    setSaved(false);
    try {
      const r = await adminSetGateways({ data: { active: nextActive, fallback: nextFallback } });
      if (r.ok) {
        setActive(r.settings.active as G);
        setFallback(r.settings.fallback as G[]);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  }

  function toggleFallback(g: G) {
    const next = fallback.includes(g) ? fallback.filter((x) => x !== g) : [...fallback, g];
    void save(active, next);
  }

  return (
    <AdminShell
      title="Gateways de pagamento"
      subtitle="Troque o gateway ativo na hora, sem publicar de novo"
      authed={authed}
      loading={loading}
      onAuthed={() => void load()}
      right={
        <button
          onClick={() => void load()}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 hover:bg-white/10"
        >
          <RefreshCw className={`h-4 w-4 ${saving ? "animate-spin" : ""}`} /> Atualizar
        </button>
      }
    >
      {saved && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <Check className="h-4 w-4" /> Configuração salva — já vale para os próximos Pix gerados.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {ALL.map((g) => {
          const isActive = active === g.key;
          return (
            <GlassCard
              key={g.key}
              className={isActive ? "border-emerald-500/40 bg-emerald-500/10" : ""}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-white">{g.label}</p>
                  <p className="mt-1 text-xs text-slate-400">{g.note}</p>
                </div>
                {isActive && (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    ATIVO
                  </span>
                )}
              </div>

              <button
                disabled={saving || isActive}
                onClick={() => void save(g.key, fallback.filter((x) => x !== g.key))}
                className={`mt-4 w-full rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "cursor-default border border-white/10 bg-white/5 text-slate-400"
                    : "bg-sky-500 text-white hover:bg-sky-400"
                }`}
              >
                {isActive ? "Em uso agora" : "Usar este gateway"}
              </button>

              {!isActive && (
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-slate-400">
                  <input
                    type="checkbox"
                    checked={fallback.includes(g.key)}
                    onChange={() => toggleFallback(g.key)}
                    className="h-4 w-4 rounded border-white/20 bg-black/40"
                  />
                  Usar como reserva se o ativo falhar
                </label>
              )}

              <button
                disabled={testing !== null}
                onClick={() => void runTest(g.key)}
                className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10 disabled:opacity-50"
              >
                {testing === g.key ? "Gerando teste…" : "Testar Pix de R$ 6,00"}
              </button>

              {testResult?.gateway === g.key && (
                <p
                  className={`mt-2 break-all text-[11px] ${
                    testResult.ok ? "text-emerald-300" : "text-rose-300"
                  }`}
                >
                  {testResult.text}
                </p>
              )}
            </GlassCard>
          );
        })}
      </div>

      <GlassCard className="mt-5">
        <h3 className="text-sm font-semibold text-white">Ordem de reserva</h3>
        <p className="mt-1 text-xs text-slate-400">
          Se o gateway ativo não responder ao gerar o Pix, o site tenta automaticamente nesta ordem:
        </p>
        <p className="mt-3 text-sm text-slate-200">
          {[active, ...fallback].map((g, i) => (
            <span key={g}>
              {i > 0 && <span className="text-slate-500"> → </span>}
              {ALL.find((a) => a.key === g)?.label}
            </span>
          ))}
        </p>
      </GlassCard>
    </AdminShell>
  );
}
