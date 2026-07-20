import { purgeCache } from "@netlify/functions";
import { getContent, getEditorContent, listVersions, publishContent, restoreVersion, saveDraft } from "../lib/content.mjs";
import { isAuthenticated } from "../lib/auth.mjs";
import { json, sameOrigin } from "../lib/http.mjs";

export default async (request) => {
  const url = new URL(request.url);
  if (request.method === "GET") {
    const adminMode = url.searchParams.get("admin") === "1" || url.searchParams.get("preview") === "1";
    if (adminMode && !(await isAuthenticated(request))) return json({ error: "Não autorizado" }, 401);
    if (url.searchParams.get("versions") === "1") return json({ versions: await listVersions() });
    const result = adminMode ? await getEditorContent() : await getContent();
    return new Response(JSON.stringify(result), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-cache, must-revalidate" } });
  }
  if (request.method !== "PUT") return json({ error: "Method not allowed" }, 405);
  if (!sameOrigin(request) || !(await isAuthenticated(request))) return json({ error: "Não autorizado" }, 401);
  try {
    const body = await request.json();
    let result;
    if (body.action === "save-draft") result = await saveDraft(body.content, body.expectedVersion);
    else if (body.action === "restore") result = await restoreVersion(body.key, body.expectedVersion);
    else result = await publishContent(body.content || body, body.expectedVersion ?? body.version);
    if (body.action !== "save-draft") await purgeCache({ tags: ["site-content"] }).catch(() => undefined);
    return json(result);
  } catch (error) {
    const conflict = String(error.message).includes("outra aba");
    return json({ error: error.message || "Conteúdo inválido" }, conflict ? 409 : 400);
  }
};

export const config = { path: "/api/content" };
