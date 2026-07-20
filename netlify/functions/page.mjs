import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getContent, getEditorContent } from "../lib/content.mjs";
import { isAuthenticated } from "../lib/auth.mjs";

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;").replaceAll('"', "&quot;")
  .replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export default async (request) => {
  const requestUrl = new URL(request.url);
  const preview = requestUrl.searchParams.get("preview") === "1" && await isAuthenticated(request);
  const [template, contentResult] = await Promise.all([
    readFile(join(process.cwd(), "public", "index.html"), "utf8"),
    preview ? getEditorContent() : getContent(),
  ]);
  const content = preview ? contentResult.content : contentResult;
  const pathLanguage = requestUrl.pathname.split("/").filter(Boolean)[0];
  const code = content.settings.languages.includes(pathLanguage) ? pathLanguage : content.settings.defaultLanguage || "en";
  const translation = content.translations[code] || content.translations.en;
  const origin = requestUrl.origin;
  const absolute = (path) => path?.startsWith("http") ? path : `${origin}${path?.startsWith("/") ? "" : "/"}${path || ""}`;
  const replacements = {
    "{{OG_TITLE}}": escapeHtml(translation.metaTitle),
    "{{OG_DESCRIPTION}}": escapeHtml(translation.metaDescription),
    "{{OG_URL}}": escapeHtml(`${origin}/${code}/`),
    "{{OG_IMAGE}}": escapeHtml(absolute(content.settings.ogImage)),
    "{{OG_LOCALE}}": code === "pt" ? "pt_BR" : code === "es" ? "es_ES" : "en_US",
    "{{HREFLANG_TAGS}}": content.settings.languages.map((language) => `<link rel="alternate" hreflang="${language}" href="${origin}/${language}/">`).join("\n  "),
    "{{JSON_LD}}": JSON.stringify({ "@context": "https://schema.org", "@type": "HousePainter", name: content.settings.businessName, url: `${origin}/`, image: absolute(content.settings.ogImage), telephone: content.settings.phone, email: content.settings.email, areaServed: content.settings.serviceArea, address: content.settings.address || undefined }),
  };
  let html = template;
  for (const [marker, value] of Object.entries(replacements)) html = html.replaceAll(marker, value);
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate",
      "netlify-cdn-cache-control": "public, max-age=10, stale-while-revalidate=30",
      "cache-tag": "site-content",
      "vary": "Accept-Encoding",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "strict-origin-when-cross-origin",
      "permissions-policy": "camera=(), microphone=(), geolocation=()",
      "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
    },
  });
};
