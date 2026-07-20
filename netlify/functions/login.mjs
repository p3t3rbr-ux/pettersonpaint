import { createSession, sessionCookie, verifyPassword } from "../lib/auth.mjs";
import { json, sameOrigin } from "../lib/http.mjs";

export default async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!sameOrigin(request)) return json({ error: "Invalid origin" }, 403);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid request" }, 400); }
  if (!verifyPassword(body.password)) return json({ error: "Senha inválida" }, 401);
  try {
    const token = await createSession();
    return json({ ok: true }, 200, { "set-cookie": sessionCookie(token, request) });
  } catch (error) {
    return json({ error: "Configure ADMIN_PASSWORD e SESSION_SECRET na Netlify" }, 503);
  }
};

export const config = { path: "/api/login", rateLimit: { windowSize: 60, windowLimit: 8, aggregateBy: ["ip"] } };
