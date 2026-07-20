import { clearSessionCookie } from "../lib/auth.mjs";
import { json } from "../lib/http.mjs";
export default () => json({ ok: true }, 200, { "set-cookie": clearSessionCookie() });
export const config = { path: "/api/logout" };

