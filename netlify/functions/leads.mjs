import { getStore } from "@netlify/blobs";
import { isAuthenticated } from "../lib/auth.mjs";
import { cleanText, json, sameOrigin } from "../lib/http.mjs";

const imageTypes = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]]);
const validImage = (type, bytes) => type === "image/jpeg" ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff : type === "image/png" ? bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 : String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
const leadsStore = () => getStore({ name: "pettersons-leads", consistency: "strong" });

export default async (request) => {
  if (request.method === "POST") {
    if (!sameOrigin(request)) return json({ error: "Origem inválida" }, 403);
    const form = await request.formData();
    if (form.get("website")) return json({ ok: true }, 202);
    const name = cleanText(form.get("name"), 100), phone = cleanText(form.get("phone"), 40), email = cleanText(form.get("email"), 160);
    if (!name || (!phone && !email)) return json({ error: "Informe seu nome e telefone ou e-mail" }, 400);
    const id = crypto.randomUUID(), createdAt = new Date().toISOString(), attachments = [];
    let totalSize = 0;
    for (const file of form.getAll("photos").slice(0, 3)) {
      if (!(file instanceof File) || !file.size) continue;
      totalSize += file.size;
      if (!imageTypes.has(file.type) || totalSize > 4 * 1024 * 1024) return json({ error: "Envie até 3 fotos JPG, PNG ou WEBP, totalizando no máximo 4 MB" }, 413);
      const fileData = await file.arrayBuffer();
      if (!validImage(file.type, new Uint8Array(fileData).slice(0, 12))) return json({ error: "Uma das fotos não contém uma imagem válida" }, 415);
      const key = `${createdAt.slice(0, 10)}/${crypto.randomUUID()}.${imageTypes.get(file.type)}`;
      await getStore("pettersons-media").set(key, fileData, { metadata: { contentType: file.type, originalName: file.name.slice(0, 180), source: "lead", leadId: id } });
      attachments.push(`/api/media/${key}`);
    }
    const lead = { id, createdAt, status: "new", name, phone, email, location: cleanText(form.get("location"), 120), service: cleanText(form.get("service"), 120), message: cleanText(form.get("message"), 1200), language: cleanText(form.get("language"), 5), attachments };
    await leadsStore().setJSON(`${Date.now()}-${id}`, lead, { metadata: { status: lead.status, createdAt } });
    return json({ ok: true, id }, 201);
  }
  if (!(await isAuthenticated(request))) return json({ error: "Não autorizado" }, 401);
  if (request.method === "GET") {
    const listing = await leadsStore().list();
    const leads = (await Promise.all(listing.blobs.slice(-100).reverse().map((item) => leadsStore().get(item.key, { type: "json" })))).filter(Boolean);
    return json({ leads });
  }
  if (!sameOrigin(request)) return json({ error: "Origem inválida" }, 403);
  const body = await request.json();
  const listing = await leadsStore().list();
  const match = listing.blobs.find((item) => item.key.endsWith(`-${body.id}`));
  if (!match) return json({ error: "Lead não encontrado" }, 404);
  if (request.method === "PATCH") {
    const lead = await leadsStore().get(match.key, { type: "json" });
    lead.status = ["new", "contacted", "won", "lost"].includes(body.status) ? body.status : lead.status;
    await leadsStore().setJSON(match.key, lead, { metadata: { status: lead.status, createdAt: lead.createdAt } });
    return json({ lead });
  }
  if (request.method === "DELETE") { await leadsStore().delete(match.key); return json({ ok: true }); }
  return json({ error: "Method not allowed" }, 405);
};

export const config = { path: "/api/leads", rateLimit: { windowSize: 60, windowLimit: 10, aggregateBy: ["ip"] } };
