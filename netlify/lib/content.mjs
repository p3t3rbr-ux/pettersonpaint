import { getStore } from "@netlify/blobs";
import defaults from "../../content/default.json" with { type: "json" };
import { cleanText } from "./http.mjs";

const contentStore = () => getStore({ name: "pettersons-content", consistency: "strong" });

export async function getContent() {
  const stored = await contentStore().get("site", { type: "json" });
  if (!stored) return structuredClone(defaults);
  const settings = {
    ...defaults.settings,
    ...stored.settings,
    sections: { ...defaults.settings.sections, ...(stored.settings?.sections || {}) },
    sectionOrder: Array.isArray(stored.settings?.sectionOrder) ? stored.settings.sectionOrder : defaults.settings.sectionOrder,
  };
  const translations = {};
  for (const code of settings.languages || defaults.settings.languages) {
    translations[code] = {
      ...(defaults.translations[code] || defaults.translations.en),
      ...(stored.translations?.[code] || {}),
      services: stored.translations?.[code]?.services || defaults.translations[code]?.services || [],
    };
  }
  return { ...defaults, ...stored, settings, translations };
}

const cleanUrl = (value) => {
  const url = String(value || "").trim().slice(0, 1000);
  if (!url) return "";
  if (url.startsWith("/api/media/") || /^https:\/\//i.test(url)) return url;
  return "";
};

export function sanitizeContent(input) {
  if (!input || typeof input !== "object" || !input.settings || !input.translations) {
    throw new Error("Invalid content document");
  }
  const settings = input.settings;
  const languages = ["en", "es", "pt"].filter((code) => settings.languages?.includes(code));
  if (!languages.length) throw new Error("At least one language is required");

  const output = {
    version: Number(input.version || 1) + 1,
    updatedAt: new Date().toISOString(),
    settings: {
      defaultLanguage: languages.includes(settings.defaultLanguage) ? settings.defaultLanguage : languages[0],
      languages,
      phone: cleanText(settings.phone, 40),
      email: cleanText(settings.email, 160),
      brandColor: /^#[0-9a-f]{6}$/i.test(settings.brandColor) ? settings.brandColor : "#00aeef",
      logo: cleanUrl(settings.logo) || "/assets/logo.webp",
      ogImage: cleanUrl(settings.ogImage) || "/assets/logo.webp",
      sections: Object.fromEntries(["hero", "links", "services", "contact", "social"].map((key) => [key, settings.sections?.[key] !== false])),
      sectionOrder: [...new Set([...(settings.sectionOrder || []), "hero", "links", "services", "contact", "social"])].filter((key) => ["hero", "links", "services", "contact", "social"].includes(key)).slice(0, 5),
      socials: (settings.socials || []).slice(0, 8).map((item) => ({
        id: cleanText(item.id, 30), label: cleanText(item.label, 50), url: cleanUrl(item.url),
      })),
      links: (settings.links || []).slice(0, 10).map((item) => ({
        id: cleanText(item.id, 30), label: cleanText(item.label, 80), type: ["sms", "tel", "email", "url"].includes(item.type) ? item.type : "url", enabled: item.enabled !== false, url: cleanUrl(item.url),
      })),
    },
    translations: {},
  };

  const fields = ["languageName", "metaTitle", "metaDescription", "eyebrow", "headline", "description", "textUs", "callNow", "linksTitle", "servicesTitle", "contactTitle", "socialTitle", "hoursLabel", "hoursValue", "footer", "linkTextTitle", "linkTextSubtitle", "linkEstimateTitle", "linkEstimateSubtitle", "linkEmailTitle", "linkEmailSubtitle"];
  for (const code of languages) {
    const source = input.translations[code] || {};
    output.translations[code] = Object.fromEntries(fields.map((field) => [field, cleanText(source[field], field.includes("Description") || field === "description" ? 700 : 180)]));
    output.translations[code].services = (source.services || []).slice(0, 12).map((service, index) => ({
      id: cleanText(service.id || `service-${index + 1}`, 40),
      title: cleanText(service.title, 100),
      description: cleanText(service.description, 400),
    }));
  }
  return output;
}

export async function saveContent(input) {
  const content = sanitizeContent(input);
  await contentStore().setJSON("site", content, { metadata: { updatedAt: content.updatedAt, version: content.version } });
  return content;
}
