const paths = new Set([
  "status", "register", "login", "logout", "workspace", "benchmark",
  "tutor", "billing/start", "billing/verify", "billing/manage", "webhooks/paystack"
]);
const unavailable = { online: false, aiConfigured: false, billingMode: "", account: null };

function json(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function forward(request, environment = process.env, send = fetch) {
  const url = new URL(request.url);
  const path = url.searchParams.get("service") || "";
  if (!paths.has(path)) return json({ error: "Page not found." }, 404);
  const configured = environment.GRADEPATH_BACKEND_ORIGIN;
  const billing = environment.GRADEPATH_ENABLE_HOSTED_CHECKOUT === "true";
  if (!configured || (!billing && (path.startsWith("billing/") || path.startsWith("webhooks/")))) {
    return path === "status" ? json(unavailable) : json({ error: "This service is not available yet." }, 503);
  }
  try {
    const upstream = new URL(configured);
    if (upstream.protocol !== "https:" || upstream.origin === url.origin || upstream.username || upstream.password) throw new Error();
    const headers = new Headers();
    for (const name of ["content-type", "origin", "cookie", "x-paystack-signature"]) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    const body = ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer();
    if (body && body.byteLength > 3_500_000) return json({ error: "This request is too large." }, 413);
    const result = await send(new URL("/api/" + path, upstream), {
      method: request.method, headers, body, redirect: "error", signal: AbortSignal.timeout(39_000)
    });
    const output = new Headers({ "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" });
    for (const cookie of result.headers.getSetCookie()) output.append("Set-Cookie", cookie);
    if (!billing && ["status", "register", "login", "logout"].includes(path) && result.ok) {
      const session = await result.json();
      session.billingMode = "";
      return new Response(JSON.stringify(session), { status: result.status, headers: output });
    }
    return new Response(result.body, { status: result.status, headers: output });
  } catch {
    return json({ error: "The GradePath service is temporarily unavailable." }, 503);
  }
}

export default { fetch: forwardRequest };

function forwardRequest(request) {
  return forward(request);
}
