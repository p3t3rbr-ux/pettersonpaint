const encoder = new TextEncoder();
const COOKIE = "pettersons_admin";
const TTL = 60 * 60 * 8;

const toBase64Url = (input) =>
  btoa(String.fromCharCode(...new Uint8Array(input)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

const sign = async (value) => {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 24) throw new Error("SESSION_SECRET is not configured");
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return toBase64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
};

const safeEqual = (a, b) => {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return result === 0;
};

export const verifyPassword = (password) => {
  const expected = process.env.ADMIN_PASSWORD;
  return Boolean(expected && expected.length >= 10 && safeEqual(String(password), expected));
};

export const createSession = async () => {
  const payload = `${Date.now() + TTL * 1000}.${crypto.randomUUID()}`;
  return `${payload}.${await sign(payload)}`;
};

export const isAuthenticated = async (request) => {
  const cookies = request.headers.get("cookie") || "";
  const raw = cookies.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${COOKIE}=`));
  if (!raw) return false;
  const token = decodeURIComponent(raw.slice(COOKIE.length + 1));
  const lastDot = token.lastIndexOf(".");
  if (lastDot < 1) return false;
  const payload = token.slice(0, lastDot);
  const signature = token.slice(lastDot + 1);
  const expires = Number(payload.split(".")[0]);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;
  return safeEqual(signature, await sign(payload));
};

export const sessionCookie = (token, request) => {
  const secure = new URL(request.url).hostname === "localhost" ? "" : " Secure;";
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly;${secure} SameSite=Strict; Max-Age=${TTL}`;
};

export const clearSessionCookie = () =>
  `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
