import { getContent, saveContent } from "../lib/content.mjs";
import { isAuthenticated } from "../lib/auth.mjs";
import { json, sameOrigin } from "../lib/http.mjs";

export default async (request) => {
  if (request.method === "GET") {
    const content = await getContent();
    return new Response(JSON.stringify(content), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=30, stale-while-revalidate=300" } });
  }
  if (request.method !== "PUT") return json({ error: "Method not allowed" }, 405);
  if (!sameOrigin(request) || !(await isAuthenticated(request))) return json({ error: "Não autorizado" }, 401);
  try { return json(await saveContent(await request.json())); }
  catch (error) { return json({ error: error.message || "Conteúdo inválido" }, 400); }
};

export const config = { path: "/api/content" };

