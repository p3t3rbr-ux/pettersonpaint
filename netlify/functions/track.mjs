import { getStore } from "@netlify/blobs";
import { isAuthenticated } from "../lib/auth.mjs";
import { cleanText, json, sameOrigin } from "../lib/http.mjs";

const allowed = ["page_view", "call_click", "text_click", "email_click", "quote_submit", "language_change", "project_view"];
export default async (request) => {
  const store = getStore({ name: "pettersons-analytics", consistency: "strong" });
  if (request.method === "GET") {
    if (!(await isAuthenticated(request))) return json({ error: "Não autorizado" }, 401);
    const result = await store.list();
    const days = (await Promise.all(result.blobs.slice(-90).reverse().map((item) => store.get(item.key, { type: "json" })))).filter(Boolean);
    return json({ days });
  }
  if (request.method !== "POST" || !sameOrigin(request)) return json({ error: "Method not allowed" }, 405);
  const body = await request.json().catch(() => ({})), event = cleanText(body.event, 40);
  if (!allowed.includes(event)) return json({ error: "Evento inválido" }, 400);
  const key = new Date().toISOString().slice(0, 10), current = await store.get(key, { type: "json" }) || { date: key, events: {} };
  current.events[event] = Number(current.events[event] || 0) + 1;
  await store.setJSON(key, current);
  return json({ ok: true }, 202);
};
export const config = { path: "/api/track", rateLimit: { windowSize: 60, windowLimit: 120, aggregateBy: ["ip"] } };
