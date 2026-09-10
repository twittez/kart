import { useState, useEffect, useCallback, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { adminLogout } from "@/utils/tiktok.functions";
import { AdminShell, GlassCard } from "@/components/AdminShell";
import { getDashboard } from "@/utils/analytics.functions";
import type { DashboardMetrics } from "@/utils/analytics.server";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin — Pessoas ao vivo na loja" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLivePage,
});

const REFRESH_MS = 4_000;

function AdminLivePage() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const timerRef = useRef<number | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const r = await getDashboard();
      if (r.ok) {
        setAuthed(true);
        setMetrics(r.metrics);
        setLastUpdate(new Date());
      } else {
        setAuthed(false);
        setMetrics(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchMetrics(); }, [fetchMetrics]);

  // Tempo real via SSE (/api/admin/stream); se a conexão cair, volta ao polling.
  useEffect(() => {
    if (!authed) return;
    let polling: number | null = null;
    const startPolling = () => {
      if (polling !== null) return;
      polling = window.setInterval(() => {
        if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
        void fetchMetrics();
      }, REFRESH_MS);
    };
    const stopPolling = () => {
      if (polling !== null) window.clearInterval(polling);
      polling = null;
    };

    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/admin/stream");
      es.addEventListener("live", (ev) => {
        try {
          const payload = JSON.parse((ev as MessageEvent).data) as { metrics: DashboardMetrics };
          stopPolling();
          setMetrics(payload.metrics);
          setLastUpdate(new Date());
        } catch {
          // ignora payload inválido
        }
      });
      es.onerror = () => startPolling();
    } catch {
      startPolling();
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") void fetchMetrics();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      es?.close();
      stopPolling();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [authed, fetchMetrics]);




  async function handleLogout() {
    await adminLogout();
    setAuthed(false);
    setMetrics(null);
  }

  const live = metrics?.live;
  const visitors = metrics?.visitors ?? [];

  return (
    <AdminShell
      title="Pessoas ao vivo na loja"
      subtitle={`Atualiza a cada 1s · ${lastUpdate ? `última: ${lastUpdate.toLocaleTimeString("pt-BR")}` : "—"}`}
      authed={authed}
      loading={loading}
      onAuthed={() => void fetchMetrics()}
      right={
        <Link
          to="/admin/dashboard"
          className="admin-btn rounded-xl px-4 py-2 text-sm text-slate-300"
        >
          Dashboard completo
        </Link>
      }
    >
      <GlassCard className="relative overflow-hidden !p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-500/25 blur-3xl" />
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#00f0ff]">
          Online agora · Night City
        </p>
        <p className="admin-title mt-3 text-7xl font-black tabular-nums leading-none">
          {live?.total ?? 0}
        </p>
        <p className="mt-3 text-sm text-slate-400">
          sessões com atividade nos últimos 30 segundos
        </p>
      </GlassCard>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <LiveCard label="Navegando" value={live?.site ?? 0} tone="cyan" />
        <LiveCard label="No checkout" value={live?.checkout ?? 0} tone="yellow" />
        <LiveCard label="Pós-compra" value={live?.purchase ?? 0} tone="magenta" />
      </div>

      <GlassCard className="mt-4 !p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-sm font-semibold text-white">Quem está na loja agora</h2>
          <span className="text-xs text-slate-500">{visitors.length} sessão(ões)</span>
        </div>
        <div className="admin-hairline h-px w-full" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Visitante</th>
                <th className="px-5 py-3">Página atual</th>
                <th className="px-5 py-3">Etapa</th>
                <th className="px-5 py-3">Origem</th>
                <th className="px-5 py-3">Local</th>
                <th className="px-5 py-3 text-right">Atividade</th>
              </tr>
            </thead>
            <tbody>
              {visitors.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                    Nenhum visitante ativo neste momento.
                  </td>
                </tr>
              )}
              {visitors.map((v) => (
                <tr key={v.sessionId} className="border-b border-white/5 hover:bg-emerald-500/[0.04]">
                  <td className="px-5 py-3">
                    <span className="block font-mono text-emerald-300">#{v.shortId}</span>
                    <span className="block text-xs text-slate-500">{v.device}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-200">{v.page}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs text-slate-300">
                      {v.stage === "checkout" ? "Checkout" : v.stage === "purchase" ? "Pós-compra" : "Navegando"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs ${sourceTone(v.source)}`}>
                      {sourceLabel(v.source)}
                    </span>
                    {v.campaign && (
                      <span className="mt-1 block text-[11px] text-slate-500">{v.campaign}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-400">
                    {[v.city, v.region, v.country].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-5 py-3 text-right text-xs text-slate-400">
                    há {v.secondsAgo}s
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <button
        onClick={handleLogout}
        className="admin-btn mt-6 rounded-xl px-4 py-2 text-sm text-slate-400 md:hidden"
      >
        Sair
      </button>
    </AdminShell>
  );
}

function sourceLabel(s: string): string {
  if (s === "tiktok") return "TikTok";
  if (s === "google") return "Google";
  if (s === "direto") return "Direto";
  if (s === "referencia") return "Indicação";
  if (s === "social") return "Social";
  return s;
}

function sourceTone(s: string): string {
  if (s === "tiktok") return "border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200";
  if (s === "google") return "border border-sky-500/30 bg-sky-500/10 text-sky-200";
  if (s === "direto") return "border border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  return "border border-white/10 bg-white/[0.05] text-slate-300";
}

const TONES = {
  cyan: { text: "text-[#00f0ff]", dot: "bg-[#00f0ff]", glow: "bg-[#00f0ff]/25" },
  yellow: { text: "text-[#fcee0a]", dot: "bg-[#fcee0a]", glow: "bg-[#fcee0a]/25" },
  magenta: { text: "text-[#ff007f]", dot: "bg-[#ff007f]", glow: "bg-[#ff007f]/25" },
  lime: { text: "text-[#00f0ff]", dot: "bg-[#00f0ff]", glow: "bg-[#00f0ff]/25" },
  amber: { text: "text-[#fcee0a]", dot: "bg-[#fcee0a]", glow: "bg-[#fcee0a]/25" },
  emerald: { text: "text-[#ff007f]", dot: "bg-[#ff007f]", glow: "bg-[#ff007f]/25" },
} as const;

function LiveCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: keyof typeof TONES;
}) {
  const t = TONES[tone];
  return (
    <GlassCard className="relative overflow-hidden">
      <div className={`pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full blur-3xl ${t.glow}`} />
      <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
        <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
        {label}
      </p>
      <p className={`mt-2 text-4xl font-bold tabular-nums ${t.text}`}>{value}</p>
    </GlassCard>
  );
}

