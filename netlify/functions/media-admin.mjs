import { getStore } from "@netlify/blobs";
import { isAuthenticated } from "../lib/auth.mjs";
import { json, sameOrigin } from "../lib/http.mjs";

export default async (request) => {
  if (!(await isAuthenticated(request))) return json({ error: "Não autorizado" }, 401);
  const store = getStore({ name: "pettersons-media", consistency: "strong" });
  if (request.method === "GET") {
    const result = await store.list();
    const media = await Promise.all(result.blobs.slice(-100).reverse().map(async (item) => ({ key: item.key, url: `/api/media/${item.key}`, metadata: await store.getMetadata(item.key) })));
    return json({ media });
  }
  if (request.method === "DELETE" && sameOrigin(request)) {
    const key = new URL(request.url).searchParams.get("key") || "";
    if (!/^\d{4}-\d{2}-\d{2}\/[a-f0-9-]+\.(jpg|png|webp|gif)$/i.test(key)) return json({ error: "Arquivo inválido" }, 400);
    await store.delete(key); return json({ ok: true });
  }
  return json({ error: "Method not allowed" }, 405);
};
export const config = { path: "/api/media-admin" };

