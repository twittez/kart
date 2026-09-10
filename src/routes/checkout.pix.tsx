import { markPixCopied, uploadPaymentProof } from "@/utils/primecash.functions";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { formatBRL } from "@/lib/checkout-state";
import { getTransactionStatus, getCheckoutSession } from "@/utils/primecash.functions";
import { useServerFn } from "@tanstack/react-start";
import { trackTikTokEvent, sendTikTokServerEvent } from "@/lib/tiktok";
import { getAttribution } from "@/lib/attribution";

export const Route = createFileRoute("/checkout/pix")({
  validateSearch: (raw: Record<string, unknown>) => ({
    s: typeof raw.s === "string" ? raw.s : "",
  }),
  component: PixPage,
});

function useCountdown(totalSeconds: number) {
  const [s, setS] = useState(totalSeconds);
  useEffect(() => {
    const id = setInterval(() => setS((x) => (x > 0 ? x - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function PixPage() {
  const navigate = useNavigate();
  const checkStatus = useServerFn(getTransactionStatus);
  const fetchSession = useServerFn(getCheckoutSession);
  const { s: initialS } = Route.useSearch();

  const [sessionId] = useState<string>(initialS);
  const [code, setCode] = useState<string>("");
  const [providedImg, setProvidedImg] = useState<string>("");
  const [amountCents, setAmountCents] = useState<number>(0);
  const [trackingCode, setTrackingCode] = useState<string>("");
  const [trackingCopied, setTrackingCopied] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState<boolean>(false);

  const amount = amountCents / 100;
  const [generatedImg, setGeneratedImg] = useState<string>("");
  const [providedImgFailed, setProvidedImgFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<string>("waiting_payment");
  const stoppedRef = useRef(false);
  const qrSectionRef = useRef<HTMLElement | null>(null);

  // Ao chegar na tela do Pix, garante que o cliente vê o QR Code de imediato:
  // volta ao topo (o scroll pode vir herdado do formulário) e, assim que o
  // código carregar, centraliza a seção do QR na tela.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!code) return;
    const t = setTimeout(() => {
      qrSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => clearTimeout(t);
  }, [code]);

  const countdown = useCountdown(15 * 60); // 15 min para pagar

  // Fetch the actual PIX payload server-side using the session id + cookie.
  useEffect(() => {
    if (!sessionId) {
      setSessionLoaded(true);
      return;
    }
    let cancelled = false;
    fetchSession({ data: { sessionId } })
      .then((r) => {
        if (cancelled) return;
        if (!r.ok) {
          setSessionError(r.error);
        } else {
          setCode(r.qrCode);
          setProvidedImg(r.qrImage || "");
          setProvidedImgFailed(false);
          setAmountCents(r.amountCents);
          setTrackingCode(r.trackingCode || "");
        }
      })
      .catch(() => {
        if (!cancelled) setSessionError("Não foi possível carregar a sessão");
      })
      .finally(() => {
        if (!cancelled) setSessionLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, fetchSession]);

  useEffect(() => {
    if (!code) return;
    QRCode.toDataURL(code, { width: 320, margin: 1 })
      .then(setGeneratedImg)
      .catch(() => setGeneratedImg(""));
  }, [code]);

  // Poll transaction status fast (every 1.5s) so we detect payment ASAP
  // and fire the TikTok Purchase event with minimal delay.
  useEffect(() => {
    if (!sessionId || !code) return;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const tick = async () => {
      if (stoppedRef.current) return;
      attempts++;
      try {
        const r = await checkStatus({ data: { sessionId } });
        if (r.ok) {
          setStatus(r.status);
          if (r.status === "paid") {
            stoppedRef.current = true;
            trackTikTokEvent(
              "CompletePayment",
              {
                content_type: "product",
                content_id: "kart-velox",
                value: amountCents / 100,
                currency: "BRL",
              },
              sessionId
            );
            void sendTikTokServerEvent({
              event: "CompletePayment",
              eventId: sessionId,
              amount: amountCents / 100,
              currency: "BRL",
              ttclid: getAttribution().ttclid,
            });
            navigate({ to: `/checkout/upsell?amount=${amountCents}&s=${sessionId}` });
            return;
          }
          if (r.status === "refused" || r.status === "chargedback" || r.status === "canceled") {
            stoppedRef.current = true;
            return;
          }
        }
      } catch {
        // ignore, will retry
      }
      // Aggressive polling: 1.5s for first 2 min, then 3s.
      const delay = attempts < 80 ? 1500 : 3000;
      timer = setTimeout(tick, delay);
    };
    timer = setTimeout(tick, 1500);
    return () => {
      stoppedRef.current = true;
      clearTimeout(timer);
    };
  }, [sessionId, code, amountCents, checkStatus, navigate]);

  const normalizedProvidedImg = useMemo(() => {
    const raw = providedImg.trim();
    if (!raw || providedImgFailed) return "";
    if (raw.startsWith("data:") || /^https?:\/\//i.test(raw) || raw.startsWith("//")) {
      return raw;
    }
    if (/^image\/(png|jpe?g|webp);base64,/i.test(raw)) {
      return `data:${raw}`;
    }
    if (/^[A-Za-z0-9+/=\s]+$/.test(raw) && raw.length > 120) {
      return `data:image/png;base64,${raw.replace(/^base64,?/i, "").replace(/\s/g, "")}`;
    }
    return "";
  }, [providedImg, providedImgFailed]);

  const qrSrc = normalizedProvidedImg || generatedImg;

  const [proofState, setProofState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [proofError, setProofError] = useState<string | null>(null);

  const sendProof = async (file: File) => {
    if (!sessionId) return;
    if (file.size > 8 * 1024 * 1024) {
      setProofState("error");
      setProofError("A imagem é muito grande. Envie uma foto de até 8MB.");
      return;
    }
    setProofState("sending");
    setProofError(null);
    try {
      const imageData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("read"));
        reader.readAsDataURL(file);
      });
      const r = await uploadPaymentProof({
        data: { sessionId, imageData, mimeType: file.type || undefined },
      });
      if (r.ok) setProofState("sent");
      else {
        setProofState("error");
        setProofError(r.error);
      }
    } catch {
      setProofState("error");
      setProofError("Não foi possível enviar a imagem.");
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (sessionId) void markPixCopied({ data: { sessionId } });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* ignore */
    }
  };

  const expiresAt = useMemo(() => {
    const d = new Date();
    d.setHours(d.getHours() + 24);
    return d;
  }, []);

  if (sessionError || (sessionLoaded && !sessionId && !code)) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
        <header className="bg-white border-b sticky top-0 z-20">
          <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
            <Link
              to="/"
              className="text-gray-700 text-xl leading-none w-8 h-8 flex items-center justify-center -ml-1"
            >
              ←
            </Link>
            <h1 className="flex-1 text-center text-base font-semibold text-gray-900">
              Pagamento Pix
            </h1>
            <div className="w-8" />
          </div>
        </header>
        <main className="flex-1 max-w-xl w-full mx-auto px-4 py-10 text-center space-y-3">
          <p className="text-gray-700">{sessionError || "PIX não encontrado."}</p>
          <Link to="/" className="text-[#ff3a30] underline text-sm">
            Voltar à loja
          </Link>
        </main>
      </div>
    );
  }

  const isPaid = status === "paid";
  const isFailed = status === "refused" || status === "chargedback" || status === "canceled";

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col pb-10">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            to="/"
            className="text-gray-700 text-xl leading-none w-8 h-8 flex items-center justify-center -ml-1"
          >
            ←
          </Link>
          <h1 className="flex-1 text-center text-base font-semibold text-gray-900">
            Pagamento Pix
          </h1>
          <div className="w-8" />
        </div>
        <div className="max-w-xl mx-auto px-4 pb-2 -mt-1 text-center">
          <span className="text-xs text-emerald-600 font-medium inline-flex items-center gap-1">
            🔒 Dados transmitidos com criptografia SSL
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-xl w-full mx-auto px-3 py-3 space-y-3">
        {/* Status / Timer */}
        <section className="bg-white rounded-xl p-4 shadow-sm text-center">
          {isPaid ? (
            <div className="flex flex-col items-center gap-2">
              <span className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg">
                ✓
              </span>
              <p className="text-sm font-semibold text-emerald-600">
                Pagamento confirmado! Preparando uma oferta especial...
              </p>
            </div>
          ) : isFailed ? (
            <p className="text-sm font-semibold text-[#ff3a30]">
              Pagamento não autorizado. Gere um novo PIX.
            </p>
          ) : (
            <>
              <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">
                Aguardando pagamento
              </p>
              <p className="mt-1 text-2xl font-bold text-[#ff3a30] tabular-nums leading-none">
                {countdown}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">Tempo restante para pagar</p>
            </>
          )}
        </section>

        {/* Valor + QR */}
        <section ref={qrSectionRef} className="bg-white rounded-xl p-4 shadow-sm scroll-mt-24">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-700">Total a pagar</span>
            <span className="text-xl font-bold text-[#ff3a30]">{formatBRL(amount)}</span>
          </div>

          <div className="flex justify-center">
            <div className="relative">
              <div className="rounded-2xl border-2 border-[#ff3a30]/40 p-3 bg-white">
                {qrSrc ? (
                  <img
                    src={qrSrc}
                    alt="QR Code PIX"
                    onError={() => setProvidedImgFailed(true)}
                    className="w-60 h-60 sm:w-64 sm:h-64 block"
                  />
                ) : (
                  <div className="w-60 h-60 sm:w-64 sm:h-64 bg-gray-100 animate-pulse rounded" />
                )}
              </div>
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#ff3a30] text-white text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full">
                QR Code Pix
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-600 text-center mt-3 leading-relaxed">
            Abra o app do seu banco, escolha pagar com{" "}
            <span className="font-semibold text-gray-800">Pix</span> e escaneie o código acima — ou
            copie o código abaixo.
          </p>
        </section>

        {/* Pix copia e cola */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-900 mb-2 inline-flex items-center gap-1.5">
            <span className="text-[#ff3a30]">📋</span> Pix copia e cola
          </p>
          <div className="bg-[#f7f7f7] border border-[#ececec] rounded-lg p-2.5">
            <p className="text-[11px] font-mono text-gray-600 break-all leading-snug max-h-20 overflow-hidden">
              {code || "Carregando..."}
            </p>
          </div>
          <button
            type="button"
            onClick={copy}
            disabled={!code}
            className="mt-3 w-full bg-[#ff3a30] hover:bg-[#e6332a] disabled:opacity-60 text-white py-3 rounded-lg font-semibold text-sm transition-colors"
          >
            {copied ? "✓ Código copiado!" : "Copiar código Pix"}
          </button>
        </section>

        {/* Código de rastreio */}
        {trackingCode && (
          <section className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm font-semibold text-gray-900 mb-1">Seu código de rastreio</p>
            <p className="text-xs text-gray-500 mb-3">
              Guarde este código. O rastreamento começa a ser atualizado após a confirmação do
              pagamento.
            </p>
            <div className="flex items-center gap-2">
              <span className="flex-1 rounded-lg border border-[#ececec] bg-[#f7f7f7] px-3 py-2.5 text-sm font-mono font-semibold tracking-wide text-gray-800">
                {trackingCode}
              </span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(trackingCode);
                    setTrackingCopied(true);
                    setTimeout(() => setTrackingCopied(false), 2500);
                  } catch {
                    /* ignore */
                  }
                }}
                className="shrink-0 rounded-lg border border-[#ff3a30] px-3 py-2.5 text-xs font-semibold text-[#ff3a30] hover:bg-[#fff1f0]"
              >
                {trackingCopied ? "Copiado!" : "Copiar"}
              </button>
            </div>
          </section>
        )}

        {/* Envio de comprovante */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-900 mb-1">Já pagou? Envie o comprovante</p>
          <p className="text-xs text-gray-500 mb-3">
            O envio é opcional: a confirmação costuma ser automática. Se demorar, mande a foto do
            comprovante para nossa equipe conferir.
          </p>
          {proofState === "sent" ? (
            <p className="rounded-lg bg-green-50 border border-green-200 px-3 py-2.5 text-sm text-green-700">
              ✓ Comprovante recebido! Nossa equipe vai conferir e liberar seu pedido.
            </p>
          ) : (
            <>
              <label className="block w-full cursor-pointer rounded-lg border border-dashed border-gray-300 bg-[#fafafa] px-3 py-3 text-center text-sm font-medium text-gray-700 hover:bg-gray-50">
                {proofState === "sending" ? "Enviando..." : "Escolher foto do comprovante"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={proofState === "sending"}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void sendProof(f);
                  }}
                />
              </label>
              {proofError && <p className="mt-2 text-xs text-red-600">{proofError}</p>}
            </>
          )}
        </section>

        {/* Passo a passo */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-900 mb-3">Como pagar com Pix</p>
          <ol className="space-y-2.5">
            {[
              "Abra o app do seu banco e entre na área Pix.",
              "Escolha pagar com QR Code ou Pix copia e cola.",
              "Confira o valor e confirme o pagamento.",
              "Pronto! A confirmação aparece aqui automaticamente.",
            ].map((t, i) => (
              <li key={i} className="flex gap-2.5 items-start text-xs text-gray-700">
                <span className="shrink-0 w-5 h-5 rounded-full bg-[#fff1f0] text-[#ff3a30] text-[11px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{t}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Rodapé info */}
        <section className="bg-white rounded-xl p-4 shadow-sm text-center space-y-1">
          <p className="text-[11px] text-gray-500">
            Este código expira em{" "}
            <span className="font-medium text-gray-700">{expiresAt.toLocaleString("pt-BR")}</span>
          </p>
          <p className="text-[11px] text-emerald-600 inline-flex items-center gap-1">
            🔒 Pagamento processado com segurança
          </p>
        </section>

        <div className="text-center pt-1">
          <Link to="/" className="text-[#ff3a30] text-xs underline">
            ← Voltar à loja
          </Link>
        </div>
      </main>
    </div>
  );
}
