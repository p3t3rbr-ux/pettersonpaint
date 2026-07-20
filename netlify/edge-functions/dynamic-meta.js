import { getStore } from "@netlify/blobs";

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;").replaceAll('"', "&quot;")
  .replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export default async (request, context) => {
  const response = await context.next();
  if (!response.ok || !(response.headers.get("content-type") || "").includes("text/html")) return response;
  let content = null;
  try { content = await getStore("pettersons-content").get("site", { type: "json" }); } catch { /* static fallback */ }
  if (!content) return response;
  const code = content.settings.defaultLanguage || "en";
  const translation = content.translations[code] || content.translations.en;
  const origin = new URL(request.url).origin;
  const absolute = (path) => path?.startsWith("http") ? path : `${origin}${path?.startsWith("/") ? "" : "/"}${path || ""}`;
  const replacements = {
    "{{OG_TITLE}}": escapeHtml(translation.metaTitle),
    "{{OG_DESCRIPTION}}": escapeHtml(translation.metaDescription),
    "{{OG_URL}}": escapeHtml(new URL(request.url).href),
    "{{OG_IMAGE}}": escapeHtml(absolute(content.settings.ogImage)),
    "{{OG_LOCALE}}": code === "pt" ? "pt_BR" : code === "es" ? "es_ES" : "en_US",
  };
  let html = await response.text();
  for (const [marker, value] of Object.entries(replacements)) html = html.replaceAll(marker, value);
  const headers = new Headers(response.headers);
  headers.set("cache-control", "public, max-age=0, must-revalidate");
  headers.set("vary", "Accept-Encoding");
  return new Response(html, { status: response.status, headers });
};

