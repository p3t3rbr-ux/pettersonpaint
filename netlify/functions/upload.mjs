import { getStore } from "@netlify/blobs";
import { isAuthenticated } from "../lib/auth.mjs";
import { json, sameOrigin } from "../lib/http.mjs";

const types = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"], ["image/gif", "gif"]]);

export default async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!sameOrigin(request) || !(await isAuthenticated(request))) return json({ error: "Não autorizado" }, 401);
  const type = (request.headers.get("content-type") || "").split(";")[0].toLowerCase();
  if (!types.has(type)) return json({ error: "Use JPG, PNG, WEBP ou GIF" }, 415);
  const data = await request.arrayBuffer();
  if (!data.byteLength || data.byteLength > 4 * 1024 * 1024) return json({ error: "A imagem deve ter no máximo 4 MB" }, 413);
  const key = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${types.get(type)}`;
  const store = getStore({ name: "pettersons-media", consistency: "strong" });
  await store.set(key, data, { metadata: { contentType: type, originalName: (request.headers.get("x-file-name") || "image").slice(0, 180), size: data.byteLength } });
  return json({ url: `/api/media/${key}`, size: data.byteLength, type }, 201);
};

export const config = { path: "/api/upload", rateLimit: { windowSize: 60, windowLimit: 20, aggregateBy: ["ip"] } };

