import { getStore } from "@netlify/blobs";

export default async (request) => {
  const marker = "/api/media/";
  const pathname = new URL(request.url).pathname;
  const key = decodeURIComponent(pathname.slice(pathname.indexOf(marker) + marker.length));
  if (!/^\d{4}-\d{2}-\d{2}\/[a-f0-9-]+\.(jpg|png|webp|gif)$/i.test(key)) return new Response("Not found", { status: 404 });
  const store = getStore("pettersons-media");
  const entry = await store.getWithMetadata(key, { type: "arrayBuffer" });
  if (!entry) return new Response("Not found", { status: 404 });
  return new Response(entry.data, { headers: { "content-type": entry.metadata?.contentType || "application/octet-stream", "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" } });
};

export const config = { path: "/api/media/*" };
