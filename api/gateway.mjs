const paths = new Set([
  "status", "register", "login", "logout", "workspace", "benchmark",
  "admin/allowance", "account/profile", "password/forgot", "password/reset", "account", "account/verify", "account/verify/request", "account/export",
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
    for (const name of ["content-type", "accept", "origin", "cookie", "x-paystack-signature"]) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    const client = (request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
    if (client) headers.set("x-gradepath-client-ip", client);
    const body = ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer();
    if (body && body.byteLength > 3_500_000) return json({ error: "This request is too large." }, 413);
    const result = await send(new URL("/api/" + path, upstream), {
      method: request.method, headers, body, redirect: "error", signal: AbortSignal.timeout(39_000)
    });
    const output = new Headers({ "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" });
    if (result.headers.get("content-type")?.includes("application/x-ndjson")) output.set("Content-Type", "application/x-ndjson");
    const disposition = result.headers.get("content-disposition");
    if (disposition && /^attachment; filename="[\w.-]+"$/.test(disposition)) output.set("Content-Disposition", disposition);
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

let application;
export default async function gateway(req, res) {
  const origin = "https://" + req.headers.host;
  const url = new URL(req.url, origin);
  const path = url.searchParams.get("service") || url.pathname.replace(/^\/api\//, "");
  if (process.env.DATABASE_URL && paths.has(path)) {
    const [{ createApp }, { settings }] = await Promise.all([import("../server.mjs"), import("../server/config.mjs")]);
    if (!application) {
      const config = settings(process.env);
      config.trustProxy = true;
      config.payment.enabled &&= config.payment.mode === "test" && process.env.GRADEPATH_ENABLE_HOSTED_CHECKOUT === "true";
      application = createApp(config);
    }
    req.url = "/api/" + path;
    req.headers["x-gradepath-client-ip"] = String(req.headers["x-vercel-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
    application.server.emit("request", req, res);
    return;
  }
  url.searchParams.set("service", path);
  const request = new Request(url, { method: req.method, headers: req.headers,
    ...(["GET","HEAD"].includes(req.method) ? {} : { body: req, duplex: "half" }) });
  const result = await forward(request);
  res.statusCode = result.status;
  for (const [key, value] of result.headers) if (key !== "set-cookie") res.setHeader(key, value);
  if (result.headers.getSetCookie().length) res.setHeader("Set-Cookie", result.headers.getSetCookie());
  res.end(Buffer.from(await result.arrayBuffer()));
}
