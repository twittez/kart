// Server-only: gateway ativo e ordem de fallback, configuráveis pelo painel.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ACTIVE_GATEWAY, type GatewayName } from "./gateway-config";

const SETTINGS_KEY = "gateway";
export const SUPPORTED_GATEWAYS: GatewayName[] = ["axxon", "beehive", "winner", "primecash"];

export type GatewaySettings = {
  active: GatewayName;
  fallback: GatewayName[];
};

const DEFAULTS: GatewaySettings = {
  active: SUPPORTED_GATEWAYS.includes(ACTIVE_GATEWAY) ? ACTIVE_GATEWAY : "axxon",
  fallback: [],
};

function sanitize(raw: unknown): GatewaySettings {
  const v = (raw ?? {}) as Partial<GatewaySettings>;
  const active = SUPPORTED_GATEWAYS.includes(v.active as GatewayName)
    ? (v.active as GatewayName)
    : DEFAULTS.active;
  const fallback = Array.isArray(v.fallback)
    ? v.fallback.filter(
        (g): g is GatewayName => SUPPORTED_GATEWAYS.includes(g as GatewayName) && g !== active
      )
    : [];
  return { active, fallback };
}

export async function getGatewaySettings(): Promise<GatewaySettings> {
  try {
    const { data } = await (supabaseAdmin.from("app_settings") as any)
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();
    return sanitize(data?.value);
  } catch {
    return DEFAULTS;
  }
}

export async function getActiveGatewayName(): Promise<GatewayName> {
  return (await getGatewaySettings()).active;
}

export async function setGatewaySettings(input: {
  active: GatewayName;
  fallback: GatewayName[];
}): Promise<GatewaySettings> {
  const value = sanitize(input);
  await (supabaseAdmin.from("app_settings") as any).upsert({
    key: SETTINGS_KEY,
    value,
    updated_at: new Date().toISOString(),
  });
  return value;
}
