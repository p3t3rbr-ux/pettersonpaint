export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });

export const cleanText = (value, max = 500) =>
  String(value ?? "").replace(/[<>]/g, "").trim().slice(0, max);

export const sameOrigin = (request) => {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === new URL(request.url).origin;
};

