import { createFileRoute } from "@tanstack/react-router";
import { getDashboardMetrics, cleanupStaleSessions } from "@/utils/analytics.server";
import { listOrders } from "@/utils/admin.server";
import { isAdminCookieValid, ADMIN_COOKIE_NAME } from "@/utils/tiktok.server";

function readAdminCookie(request: Request): string | undefined {
  const raw = request.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === ADMIN_COOKIE_NAME) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

/**
 * Fluxo em tempo real do painel: visitantes ao vivo, funil, pedidos pagos e
 * chave Pix copiada. Atualiza a cada segundo sem precisar recarregar a página.
 */
export const Route = createFileRoute("/api/admin/stream")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAdminCookieValid(readAdminCookie(request))) {
          return new Response("Unauthorized", { status: 401 });
        }

        const encoder = new TextEncoder();
        let closed = false;

        const stream = new ReadableStream({
          async start(controller) {
            const send = (event: string, data: unknown) => {
              if (closed) return;
              try {
                controller.enqueue(
                  encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
                );
              } catch {
                closed = true;
              }
            };

            let ticks = 0;
            const tick = async () => {
              if (closed) return;
              try {
                if (ticks % 30 === 0) {
                  try {
                    await cleanupStaleSessions();
                  } catch {
                    // limpeza é oportunista
                  }
                }
                const metrics = await getDashboardMetrics();
                send("live", { metrics, at: new Date().toISOString() });

                if (ticks % 5 === 0) {
                  const orders = await listOrders({ status: "all" });
                  send("orders", {
                    orders: orders.slice(0, 20),
                    at: new Date().toISOString(),
                  });
                }
              } catch (err) {
                send("error", { message: "falha ao atualizar" });
                console.error("[admin-stream] tick failed", err);
              }
              ticks += 1;
            };

            await tick();
            const interval = setInterval(() => {
              void tick();
            }, 1_000);

            request.signal.addEventListener("abort", () => {
              closed = true;
              clearInterval(interval);
              try {
                controller.close();
              } catch {
                // já fechado
              }
            });
          },
          cancel() {
            closed = true;
          },
        });

        return new Response(stream, {
          headers: {
            "content-type": "text/event-stream; charset=utf-8",
            "cache-control": "no-cache, no-transform",
            connection: "keep-alive",
            "x-accel-buffering": "no",
          },
        });
      },
    },
  },
});
