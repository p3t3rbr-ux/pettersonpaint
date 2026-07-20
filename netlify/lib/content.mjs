import { getStore } from "@netlify/blobs";
import defaults from "../../content/default.json" with { type: "json" };
import { cleanText } from "./http.mjs";

const KEYS = { published: "site", draft: "draft" };
const SECTION_KEYS = ["hero", "stats", "services", "projects", "testimonials", "quote", "links", "contact", "social"];
const contentStore = () => getStore({ name: "pettersons-content", consistency: "strong" });

const cleanUrl = (value) => {
  const url = String(value || "").trim().slice(0, 1000);
  if (!url) return "";
  if (url.startsWith("/api/media/") || /^https:\/\//i.test(url)) return url;
  return "";
};

const mergeContent = (stored) => {
  if (!stored) return structuredClone(defaults);
  const settings = {
    ...defaults.settings,
    ...stored.settings,
    sections: { ...defaults.settings.sections, ...(stored.settings?.sections || {}) },
    sectionOrder: [...new Set([...(Array.isArray(stored.settings?.sectionOrder) ? stored.settings.sectionOrder : []), ...defaults.settings.sectionOrder])],
  };
  const translations = {};
  for (const code of settings.languages || defaults.settings.languages) {
    translations[code] = {
      ...(defaults.translations[code] || defaults.translations.en),
      ...(stored.translations?.[code] || {}),
      services: stored.translations?.[code]?.services || defaults.translations[code]?.services || [],
    };
  }
  return { ...defaults, ...stored, settings, translations, projects: stored.projects || [], testimonials: stored.testimonials || [], stats: stored.stats || [] };
};

export async function getContent() {
  return mergeContent(await contentStore().get(KEYS.published, { type: "json" }));
}

export async function getEditorContent() {
  const store = contentStore();
  const [draft, published] = await Promise.all([
    store.get(KEYS.draft, { type: "json" }),
    store.get(KEYS.published, { type: "json" }),
  ]);
  return { content: mergeContent(draft || published), status: draft ? "draft" : "published", publishedVersion: Number(published?.version || defaults.version) };
}

const sanitizeTranslations = (translations, languages, fields) => Object.fromEntries(languages.map((code) => {
  const source = translations?.[code] || {};
  return [code, Object.fromEntries(fields.map((field) => [field, cleanText(source[field], field === "description" ? 600 : 160)]))];
}));

export function sanitizeContent(input, nextVersion = Number(input?.version || 0) + 1) {
  if (!input || typeof input !== "object" || !input.settings || !input.translations) throw new Error("Documento de conteúdo inválido");
  const settings = input.settings;
  const languages = ["en", "es", "pt"].filter((code) => settings.languages?.includes(code));
  if (!languages.length) throw new Error("Pelo menos um idioma é obrigatório");
  const translationFields = ["languageName", "metaTitle", "metaDescription", "eyebrow", "headline", "description", "textUs", "callNow", "linksTitle", "servicesTitle", "projectsTitle", "testimonialsTitle", "quoteTitle", "quoteDescription", "formName", "formPhone", "formEmail", "formLocation", "formService", "formMessage", "formSubmit", "formSuccess", "contactTitle", "socialTitle", "hoursLabel", "hoursValue", "footer", "linkTextTitle", "linkTextSubtitle", "linkEstimateTitle", "linkEstimateSubtitle", "linkEmailTitle", "linkEmailSubtitle"];
  const output = {
    version: nextVersion,
    updatedAt: new Date().toISOString(),
    settings: {
      defaultLanguage: languages.includes(settings.defaultLanguage) ? settings.defaultLanguage : languages[0], languages,
      phone: cleanText(settings.phone, 40), email: cleanText(settings.email, 160),
      businessName: cleanText(settings.businessName, 120), serviceArea: cleanText(settings.serviceArea, 180), address: cleanText(settings.address, 240), businessHours: cleanText(settings.businessHours, 180),
      brandColor: /^#[0-9a-f]{6}$/i.test(settings.brandColor) ? settings.brandColor : "#00aeef",
      logo: cleanUrl(settings.logo) || "/assets/logo.webp", ogImage: cleanUrl(settings.ogImage) || "/assets/logo.webp",
      sections: Object.fromEntries(SECTION_KEYS.map((key) => [key, settings.sections?.[key] !== false])),
      sectionOrder: [...new Set([...(settings.sectionOrder || []), ...SECTION_KEYS])].filter((key) => SECTION_KEYS.includes(key)).slice(0, SECTION_KEYS.length),
      socials: (settings.socials || []).slice(0, 12).map((item) => ({ id: cleanText(item.id, 40), label: cleanText(item.label, 60), url: cleanUrl(item.url) })),
      links: (settings.links || []).slice(0, 12).map((item) => ({ id: cleanText(item.id, 40), label: cleanText(item.label, 80), type: ["sms", "tel", "email", "url"].includes(item.type) ? item.type : "url", enabled: item.enabled !== false, url: cleanUrl(item.url) })),
    },
    translations: {}, projects: [], testimonials: [], stats: [],
  };
  for (const code of languages) {
    const source = input.translations[code] || {};
    output.translations[code] = Object.fromEntries(translationFields.map((field) => [field, cleanText(source[field], field.toLowerCase().includes("description") ? 700 : 180)]));
    output.translations[code].services = (source.services || []).slice(0, 16).map((service, index) => ({ id: cleanText(service.id || `service-${index + 1}`, 50), title: cleanText(service.title, 120), description: cleanText(service.description, 500) }));
  }
  output.projects = (input.projects || []).slice(0, 30).map((item) => ({ id: cleanText(item.id || crypto.randomUUID(), 50), enabled: item.enabled !== false, coverImage: cleanUrl(item.coverImage), beforeImage: cleanUrl(item.beforeImage), afterImage: cleanUrl(item.afterImage), translations: sanitizeTranslations(item.translations, languages, ["title", "description", "location"]) }));
  output.testimonials = (input.testimonials || []).slice(0, 30).map((item) => ({ id: cleanText(item.id || crypto.randomUUID(), 50), enabled: item.enabled !== false, rating: Math.min(5, Math.max(1, Number(item.rating || 5))), translations: sanitizeTranslations(item.translations, languages, ["name", "quote", "location"]) }));
  output.stats = (input.stats || []).slice(0, 8).map((item) => ({ id: cleanText(item.id || crypto.randomUUID(), 50), value: cleanText(item.value, 30), translations: sanitizeTranslations(item.translations, languages, ["label"]) }));
  return output;
}

const assertVersion = (inputVersion, currentVersion) => {
  if (Number(inputVersion) !== Number(currentVersion)) throw new Error("Este conteúdo foi alterado em outra aba. Recarregue o painel antes de salvar.");
};

export async function saveDraft(input, expectedVersion) {
  const current = await getEditorContent();
  assertVersion(expectedVersion, current.content.version);
  const draft = sanitizeContent(input, Number(current.content.version) + 1);
  await contentStore().setJSON(KEYS.draft, draft, { metadata: { updatedAt: draft.updatedAt, version: draft.version } });
  return { content: draft, status: "draft", publishedVersion: current.publishedVersion };
}

export async function publishContent(input, expectedVersion) {
  const store = contentStore();
  const current = await getEditorContent();
  assertVersion(expectedVersion, current.content.version);
  const published = sanitizeContent(input, Number(current.content.version) + 1);
  const previous = await getContent();
  await Promise.all([
    store.setJSON(KEYS.published, published, { metadata: { updatedAt: published.updatedAt, version: published.version } }),
    store.setJSON(`versions/${String(previous.version).padStart(8, "0")}`, previous, { metadata: { updatedAt: previous.updatedAt, version: previous.version } }),
    store.delete(KEYS.draft),
  ]);
  return { content: published, status: "published", publishedVersion: published.version };
}

export async function listVersions() {
  const result = await contentStore().list({ prefix: "versions/" });
  return result.blobs.slice(-20).reverse().map((item) => ({ key: item.key, version: Number(item.key.split("/").pop()), etag: item.etag }));
}

export async function restoreVersion(key, expectedVersion) {
  if (!/^versions\/\d{8}$/.test(key)) throw new Error("Versão inválida");
  const current = await getEditorContent();
  assertVersion(expectedVersion, current.content.version);
  const historical = await contentStore().get(key, { type: "json" });
  if (!historical) throw new Error("Versão não encontrada");
  const draft = sanitizeContent(historical, Number(current.content.version) + 1);
  await contentStore().setJSON(KEYS.draft, draft, { metadata: { restoredFrom: key, version: draft.version } });
  return { content: draft, status: "draft", publishedVersion: current.publishedVersion };
}
