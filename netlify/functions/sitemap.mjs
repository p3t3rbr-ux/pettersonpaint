import { getContent } from "../lib/content.mjs";
export default async (request) => {
  const content = await getContent(), origin = new URL(request.url).origin;
  const urls = content.settings.languages.map((code) => `<url><loc>${origin}/${code}/</loc><lastmod>${content.updatedAt.slice(0, 10)}</lastmod></url>`).join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
};
export const config = { path: "/sitemap.xml" };

