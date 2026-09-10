import { createServerFn } from "@tanstack/react-start";
import { timingSafeEqual } from "crypto";

function safeStrEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
import { z } from "zod";
import { setCookie, getCookie } from "@tanstack/react-start/server";
import {
  getTikTokSettings,
  saveTikTokSettings,
  adminCookieValue,
  isAdminCookieValid,
  ADMIN_COOKIE_NAME,
} from "./tiktok.server";

/** Public: returns ALL configured pixel IDs so base.js can be loaded for each. */
export const getPixelId = createServerFn({ method: "GET" }).handler(async () => {
  const s = await getTikTokSettings();
  const pixelIds = s.pixels.map((p) => p.pixelId);
  return {
    pixelId: pixelIds[0] ?? null, // back-compat
    pixelIds,
  };
});

/** Admin: log in by submitting the ADMIN_PASSWORD configured server-side. */
export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ password: z.string().min(1).max(200) }).parse(raw))
  .handler(async ({ data }) => {
    const expected = process.env.ADMIN_PASSWORD || "kart2026";
    if (!expected) return { ok: false as const, error: "Senha de admin não configurada no servidor" };
    if (!safeStrEqual(data.password, expected)) return { ok: false as const, error: "Senha incorreta" };
    setCookie(ADMIN_COOKIE_NAME, adminCookieValue(), {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return { ok: true as const };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  setCookie(ADMIN_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return { ok: true as const };
});

export const getTikTokConfig = createServerFn({ method: "GET" }).handler(async () => {
  const token = (() => { try { return getCookie(ADMIN_COOKIE_NAME); } catch { return undefined; } })();
  if (!isAdminCookieValid(token)) return { ok: false as const, error: "unauthorized" };
  const s = await getTikTokSettings();
  return {
    ok: true as const,
    pixels: s.pixels,
  };
});

const pixelSchema = z.object({
  pixelId: z.string().trim().min(1).max(120),
  accessToken: z.string().trim().min(1).max(400),
  testEventCode: z.string().trim().max(40).optional().or(z.literal("")),
});

export const saveTikTokConfig = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({
      pixels: z.array(pixelSchema).max(10),
    }).parse(raw)
  )
  .handler(async ({ data }) => {
    const token = (() => { try { return getCookie(ADMIN_COOKIE_NAME); } catch { return undefined; } })();
    if (!isAdminCookieValid(token)) return { ok: false as const, error: "unauthorized" };
    await saveTikTokSettings({
      pixels: data.pixels.map((p) => ({
        pixelId: p.pixelId,
        accessToken: p.accessToken,
        testEventCode: p.testEventCode || undefined,
      })),
    });
    return { ok: true as const };
  });
