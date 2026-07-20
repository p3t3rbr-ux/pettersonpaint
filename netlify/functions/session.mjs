import { isAuthenticated } from "../lib/auth.mjs";
import { json } from "../lib/http.mjs";
export default async (request) => json({ authenticated: await isAuthenticated(request) });
export const config = { path: "/api/session" };

