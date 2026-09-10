import { useState, useEffect } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  adminLogin,
  adminLogout,
  getTikTokConfig,
  saveTikTokConfig,
} from "@/utils/tiktok.functions";

export const Route = createFileRoute("/admin/tiktok")({
  head: () => ({
    meta: [
      { title: "Admin — TikTok Pixel" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminTikTokPage,
});

type PixelDraft = { pixelId: string; accessToken: string; testEventCode: string };

const emptyPixel = (): PixelDraft => ({ pixelId: "", accessToken: "", testEventCode: "" });

function AdminTikTokPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [pixels, setPixels] = useState<PixelDraft[]>([emptyPixel()]);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const r = await getTikTokConfig();
      if (r.ok) {
        setAuthed(true);
        setPixels(
          r.pixels.length
            ? r.pixels.map((p) => ({
                pixelId: p.pixelId,
                accessToken: p.accessToken,
                testEventCode: p.testEventCode ?? "",
              }))
            : [emptyPixel()]
        );
      }
      setLoading(false);
    })();
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const r = await adminLogin({ data: { password } });
    if (r.ok) {
      setAuthed(true);
      const cfg = await getTikTokConfig();
      if (cfg.ok) {
        setPixels(
          cfg.pixels.length
            ? cfg.pixels.map((p) => ({
                pixelId: p.pixelId,
                accessToken: p.accessToken,
                testEventCode: p.testEventCode ?? "",
              }))
            : [emptyPixel()]
        );
      }
    } else {
      setMsg({ type: "err", text: r.error || "Erro ao entrar" });
    }
  }

  function updatePixel(i: number, patch: Partial<PixelDraft>) {
    setPixels((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  function addPixel() {
    setPixels((prev) => [...prev, emptyPixel()]);
  }

  function removePixel(i: number) {
    setPixels((prev) => (prev.length === 1 ? [emptyPixel()] : prev.filter((_, idx) => idx !== i)));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const cleaned = pixels
      .map((p) => ({
        pixelId: p.pixelId.trim(),
        accessToken: p.accessToken.trim(),
        testEventCode: p.testEventCode.trim(),
      }))
      .filter((p) => p.pixelId && p.accessToken);

    if (!cleaned.length) {
      setMsg({ type: "err", text: "Adicione ao menos um pixel com ID e token." });
      return;
    }

    const r = await saveTikTokConfig({ data: { pixels: cleaned } });
    if (r.ok) setMsg({ type: "ok", text: `Configuração salva! ${cleaned.length} pixel(s) ativo(s).` });
    else setMsg({ type: "err", text: r.error || "Erro ao salvar" });
  }

  async function handleLogout() {
    await adminLogout();
    setAuthed(false);
    setPassword("");
    router.invalidate();
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-600">Carregando…</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Admin — TikTok Pixel</h1>
        <p className="text-sm text-gray-500 mb-6">
          Configure um ou mais Pixel IDs com seus respectivos Access Tokens (Events API). Toda confirmação de PIX dispara
          o evento <strong>Purchase</strong> em <strong>todos</strong> os pixels configurados.
        </p>

        {!authed ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha de admin</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">Configurada via secret <code>ADMIN_PASSWORD</code>.</p>
            </div>
            {msg && <p className={`text-sm ${msg.type === "ok" ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>}
            <button type="submit" className="w-full bg-[#3483fa] hover:bg-[#2968c8] text-white font-medium py-2 rounded">Entrar</button>
          </form>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {pixels.map((px, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800">Pixel #{i + 1}</h3>
                  <button
                    type="button"
                    onClick={() => removePixel(i)}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Remover
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Pixel ID</label>
                  <input
                    value={px.pixelId}
                    onChange={(e) => updatePixel(i, { pixelId: e.target.value })}
                    placeholder="Ex.: CXXXXXXXXXXXXXXX"
                    className="w-full border rounded-md px-3 py-2 text-sm font-mono bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Access Token (Events API)</label>
                  <input
                    value={px.accessToken}
                    onChange={(e) => updatePixel(i, { accessToken: e.target.value })}
                    placeholder="Token longo gerado no Events API"
                    className="w-full border rounded-md px-3 py-2 text-sm font-mono bg-white"
                    type="password"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Test Event Code <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    value={px.testEventCode}
                    onChange={(e) => updatePixel(i, { testEventCode: e.target.value })}
                    placeholder="Ex.: TEST12345"
                    className="w-full border rounded-md px-3 py-2 text-sm font-mono bg-white"
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addPixel}
              className="w-full border-2 border-dashed border-gray-300 hover:border-[#3483fa] hover:text-[#3483fa] text-gray-600 text-sm font-medium py-3 rounded-lg transition"
            >
              + Adicionar outro pixel
            </button>

            {msg && <p className={`text-sm ${msg.type === "ok" ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>}

            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 bg-[#3483fa] hover:bg-[#2968c8] text-white font-medium py-2 rounded">Salvar</button>
              <button type="button" onClick={handleLogout} className="px-4 py-2 border rounded text-sm text-gray-700 hover:bg-gray-50">Sair</button>
            </div>

            <div className="mt-6 pt-6 border-t text-xs text-gray-500 space-y-2">
              <p><strong>Como funciona:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Todos os Pixel base.js são carregados em paralelo nas páginas (PageView automático em cada um).</li>
                <li>O evento <strong>Purchase</strong> é enviado pela <strong>Events API</strong> para cada pixel quando o webhook do gateway confirma o pagamento.</li>
                <li>O mesmo <code>event_id</code> é usado em todos os pixels para deduplicação.</li>
              </ul>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
