// Captura e persiste a origem de tráfego do visitante (client-side).
// Guardamos a PRIMEIRA visita com parâmetros de campanha e reutilizamos
// durante toda a sessão do funil, para que o pedido saia atribuído.

export type Attribution = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  gclid?: string;
  ttclid?: string;
  referrer?: string;
  device?: string;
};

const KEY = "attr_v1";

const PARAM_MAP: Array<[string, keyof Attribution]> = [
  ["utm_source", "utmSource"],
  ["utm_medium", "utmMedium"],
  ["utm_campaign", "utmCampaign"],
  ["utm_content", "utmContent"],
  ["utm_term", "utmTerm"],
  ["gclid", "gclid"],
  ["ttclid", "ttclid"],
];

function detectDevice(): string {
  if (typeof navigator === "undefined") return "unknown";
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? "mobile" : "desktop";
}

/** Chame uma vez por carregamento de página (dentro de useEffect). */
export function captureAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  let stored: Attribution = {};
  try {
    stored = JSON.parse(localStorage.getItem(KEY) || "{}") as Attribution;
  } catch {
    stored = {};
  }

  const params = new URLSearchParams(window.location.search);
  const incoming: Attribution = {};
  for (const [param, field] of PARAM_MAP) {
    const v = params.get(param);
    if (v) incoming[field] = v.slice(0, 200);
  }

  const hasIncoming = Object.keys(incoming).length > 0;
  const next: Attribution = hasIncoming
    ? {
        ...incoming,
        referrer: (document.referrer || "").slice(0, 300) || stored.referrer,
        device: detectDevice(),
      }
    : {
        ...stored,
        referrer: stored.referrer || (document.referrer || "").slice(0, 300) || undefined,
        device: detectDevice(),
      };

  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  return next;
}

export function getAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || "{}") as Attribution;
    return { ...a, device: detectDevice() };
  } catch {
    return { device: detectDevice() };
  }
}
