import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getContent } from "../lib/content.mjs";

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;").replaceAll('"', "&quot;")
  .replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export default async (request) => {
  const [template, content] = await Promise.all([
    readFile(join(process.cwd(), "public", "index.html"), "utf8"),
    getContent(),
  ]);
  const code = content.settings.defaultLanguage || "en";
  const translation = content.translations[code] || content.translations.en;
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const absolute = (path) => path?.startsWith("http") ? path : `${origin}${path?.startsWith("/") ? "" : "/"}${path || ""}`;
  const replacements = {
    "{{OG_TITLE}}": escapeHtml(translation.metaTitle),
    "{{OG_DESCRIPTION}}": escapeHtml(translation.metaDescription),
    "{{OG_URL}}": escapeHtml(requestUrl.href),
    "{{OG_IMAGE}}": escapeHtml(absolute(content.settings.ogImage)),
    "{{OG_LOCALE}}": code === "pt" ? "pt_BR" : code === "es" ? "es_ES" : "en_US",
  };
  let html = template;
  for (const [marker, value] of Object.entries(replacements)) html = html.replaceAll(marker, value);
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate",
      "netlify-cdn-cache-control": "public, max-age=10, stale-while-revalidate=30",
      "vary": "Accept-Encoding",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "strict-origin-when-cross-origin",
      "permissions-policy": "camera=(), microphone=(), geolocation=()",
      "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
    },
  });
};
