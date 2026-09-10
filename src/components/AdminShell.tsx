import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, BarChart3, CreditCard, LayoutDashboard, LogOut, ShoppingBag, Receipt, Wallet, Plug, Truck, Zap, ShieldAlert } from "lucide-react";
import { adminLogin, adminLogout } from "@/utils/tiktok.functions";
import cyberpunkBgUrl from "@/assets/cyberpunk-bg.jpg";

const cyberStyle = { "--admin-cyber-image": `url(${cyberpunkBgUrl})` } as React.CSSProperties;

function CyberpunkBackdrop() {
  return (
    <>
      <div className="admin-cyberpunk-bg" style={cyberStyle} aria-hidden />
      <div className="admin-scanlines" aria-hidden />
      <div className="admin-cyber-particles" aria-hidden />
      <div className="admin-fog" aria-hidden />
    </>
  );
}

const NAV = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin", label: "Ao vivo", icon: Activity },
  { to: "/admin/cartoes", label: "Cartões recusados", icon: CreditCard },
  { to: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
  { to: "/admin/comprovantes", label: "Comprovantes", icon: Receipt },
  { to: "/admin/rastreio", label: "Rastreio", icon: Truck },
  { to: "/admin/trafego", label: "Tráfego", icon: BarChart3 },
  { to: "/admin/gateways", label: "Gateways", icon: Wallet },
  { to: "/admin/integracoes", label: "Integrações", icon: Plug },
] as const;

export function AdminShell({
  title,
  subtitle,
  authed,
  loading,
  onAuthed,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  authed: boolean;
  loading: boolean;
  onAuthed: () => void;
  right?: ReactNode;
  children: ReactNode;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    document.documentElement.classList.add("admin-dark");
    return () => document.documentElement.classList.remove("admin-dark");
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await adminLogin({ data: { password } });
      if (r.ok) {
        setPassword("");
        onAuthed();
      } else {
        setError(r.error || "Senha incorreta");
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="admin-canvas min-h-screen text-slate-300 flex items-center justify-center">
        <CyberpunkBackdrop />
        <div className="relative z-10 flex items-center gap-3 text-sm font-mono tracking-widest uppercase text-[#00f0ff]">
          <span className="admin-pulse-dot h-2.5 w-2.5 rounded-full bg-[#fcee0a] text-[#fcee0a]" />
          Carregando Terminal Cyberpunk...
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="admin-canvas min-h-screen flex items-center justify-center px-4">
        <CyberpunkBackdrop />
        <form
          onSubmit={handleLogin}
          className="admin-panel relative z-10 w-full max-w-sm rounded-3xl p-7 border border-[#00f0ff]/30 shadow-[0_0_50px_-10px_rgba(0,240,255,0.25)]"
        >
          <div className="admin-hairline mb-6 h-[2px] w-full" />
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-[#fcee0a] shadow-[0_0_10px_#fcee0a]" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#fcee0a]">
              NIGHT CITY // NETRUNNER OS
            </p>
          </div>
          <h1 className="admin-title text-2xl font-black uppercase tracking-wider">Painel Cyberpunk</h1>
          <p className="text-xs text-slate-400 mt-1 mb-6 flex items-center gap-1.5 font-mono">
            <ShieldAlert className="h-3.5 w-3.5 text-[#00f0ff]" /> Protocolo de segurança restrito
          </p>
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite a senha (kart2026)"
              autoFocus
              className="w-full rounded-xl border border-[#00f0ff]/40 bg-black/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-[#fcee0a] focus:ring-2 focus:ring-[#fcee0a]/30 font-mono"
            />
          </div>
          {error && (
            <p className="mt-3 text-xs font-semibold text-rose-400 bg-rose-950/40 border border-rose-800/40 p-2.5 rounded-lg font-mono">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="admin-cta mt-5 w-full rounded-xl py-3.5 text-xs font-black uppercase tracking-widest disabled:opacity-60 cursor-pointer"
          >
            {busy ? "Autenticando…" : "Conectar ao Terminal →"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-canvas min-h-screen text-slate-200 font-sans">
      <CyberpunkBackdrop />
      <div className="relative z-10 flex min-h-screen">
        <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-[#00f0ff]/15 bg-[#070b16]/75 backdrop-blur-2xl p-4">
          <div className="flex items-center gap-3 px-2 pb-1">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#fcee0a] to-[#00f0ff] p-0.5 shadow-[0_0_20px_rgba(252,238,10,0.5)]">
              <div className="flex h-full w-full items-center justify-center rounded-[6px] bg-[#070b16]">
                <Zap className="h-4 w-4 text-[#fcee0a]" />
              </div>
            </div>
            <div className="leading-tight">
              <p className="text-sm font-black tracking-wider text-white">KART // TURBO</p>
              <p className="text-[9px] uppercase tracking-[0.25em] text-[#00f0ff] font-bold">Cyberpunk 2077</p>
            </div>
          </div>
          <div className="admin-hairline my-4 h-[2px] w-full" />
          <nav className="space-y-1.5">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`admin-nav-item flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-medium ${
                    active
                      ? "admin-nav-active"
                      : "border-transparent text-slate-400 hover:bg-white/[0.05] hover:text-[#00f0ff] hover:border-[#00f0ff]/20"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-[#fcee0a]" : ""}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button
            onClick={async () => {
              await adminLogout();
              window.location.reload();
            }}
            className="mt-auto flex items-center gap-2 rounded-xl border border-transparent px-3 py-2.5 text-sm text-slate-500 transition hover:border-rose-500/25 hover:bg-rose-500/10 hover:text-rose-300"
          >
            <LogOut className="h-4 w-4" /> Desconectar
          </button>
        </aside>

        <main className="flex-1 min-w-0 px-4 py-6 sm:px-8">
          <div className="mb-7 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em] text-[#00f0ff]">
                <span className="admin-pulse-dot h-1.5 w-1.5 rounded-full bg-[#fcee0a] text-[#fcee0a]" />
                Night City · Operação em tempo real
              </p>
              <h1 className="admin-title text-3xl sm:text-4xl font-black tracking-tight uppercase">{title}</h1>
              {subtitle && <p className="mt-1.5 text-sm text-slate-400">{subtitle}</p>}
            </div>
            {right}
          </div>

          {/* Navegação em telas pequenas */}
          <nav className="md:hidden mb-5 flex gap-2 overflow-x-auto pb-1">
            {NAV.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
                    active
                      ? "border-[#fcee0a]/60 bg-[#fcee0a]/15 text-[#fcee0a]"
                      : "border-white/10 bg-white/[0.04] text-slate-400"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {children}
        </main>
      </div>
    </div>
  );
}

export function GlassCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`admin-panel admin-panel-hover rounded-2xl p-5 ${className}`}>{children}</div>
  );
}


export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export type DatePresetKey = "today" | "yesterday" | "7d" | "30d" | "all";

export function formatOrderDate(iso: string): string {
  try {
    const d = new Date(iso);
    const TZ = "America/Sao_Paulo";
    const now = new Date();
    const dStr = d.toLocaleDateString("en-CA", { timeZone: TZ });
    const nowStr = now.toLocaleDateString("en-CA", { timeZone: TZ });
    const yesterday = new Date(Date.now() - 86_400_000);
    const yestStr = yesterday.toLocaleDateString("en-CA", { timeZone: TZ });

    const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });

    if (dStr === nowStr) return `Hoje às ${time}`;
    if (dStr === yestStr) return `Ontem às ${time}`;
    return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: TZ })} às ${time}`;
  } catch {
    return iso;
  }
}

export function getPresetDateRange(key: DatePresetKey): { from?: string; to?: string; label: string } {
  const TZ = "America/Sao_Paulo";
  const now = new Date();
  const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
  const shift = (days: number) => dayKey(new Date(Date.now() + days * 86_400_000));
  const iso = (day: string, end = false) => `${day}T${end ? "23:59:59.999" : "00:00:00.000"}-03:00`;

  switch (key) {
    case "today":
      return { from: iso(shift(0)), to: iso(shift(0), true), label: "Hoje" };
    case "yesterday":
      return { from: iso(shift(-1)), to: iso(shift(-1), true), label: "Ontem" };
    case "7d":
      return { from: iso(shift(-6)), to: iso(shift(0), true), label: "Últimos 7 dias" };
    case "30d":
      return { from: iso(shift(-29)), to: iso(shift(0), true), label: "Últimos 30 dias" };
    case "all":
    default:
      return { label: "Todo o período" };
  }
}

export function downloadCsv(filename: string, rows: (string | number | null)[][]) {
  const escape = (v: string | number | null) => {
    const s = String(v ?? "");
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((r) => r.map(escape).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
