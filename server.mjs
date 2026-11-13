/* Optional GradePath server. The browser can run the local study tools without it. */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { timingSafeEqual } from "node:crypto";
import { parseArgs } from "node:util";
import { settings } from "./server/config.mjs";
import {
  AppError, clean, createDatabase, createUser, verifyUser, issueSession, userFromSession,
  clearSession, saveBenchmark, getBenchmark, digest
} from "./server/store.mjs";
import { createTutor } from "./server/ai.mjs";
import { createBilling } from "./server/billing.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));
const staticFiles = new Map([
  ["/", "index.html"], ["/index.html", "index.html"], ["/styles.css", "styles.css"],
  ...["core", "catalog", "app", "grades", "study", "exams", "lab", "online", "school", "projects", "experience", "appearance"].map(name => ["/" + name + ".js", name + ".js"]),
  ["/runner.html", "runner.html"], ...["sora.woff", "inter.woff"].map(name => ["/vendor/fonts/" + name, "vendor/fonts/" + name]), ["/favicon.svg", "favicon.svg"], ["/vendor/pdf.min.mjs", "vendor/pdf.min.mjs"],
  ["/vendor/pdf.worker.min.mjs", "vendor/pdf.worker.min.mjs"]
]);
const contentTypes = { woff: "font/woff", svg: "image/svg+xml", html: "text/html; charset=utf-8", css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8", mjs: "text/javascript; charset=utf-8" };
const mainPolicy = "default-src 'self'; script-src 'self'; style-src 'self'; worker-src 'self' blob:; "
  + "frame-src 'self' about:; img-src 'self' blob: data:; connect-src 'self'; "
  + "object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";
const runnerPolicy = "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; "
  + "worker-src blob:; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'";

async function body(request, limit) {
  if (Number(request.headers["content-length"]) > limit) throw new AppError(413, "This request is too large.");
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new AppError(413, "This request is too large.");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function jsonBody(request, limit = 50_000) {
  if (request.headers["content-type"]?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
    throw new AppError(415, "Send JSON to this endpoint.");
  }
  try {
    const parsed = JSON.parse((await body(request, limit)).toString("utf8"));
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error();
    return parsed;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(400, "The request contained invalid JSON.");
  }
}

function json(response, code, payload) {
  response.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(payload));
}

function sameOrigin(request, publicOrigin) {
  const raw = request.headers.origin;
  try {
    const origin = new URL(raw);
    if (publicOrigin ? origin.origin === publicOrigin
      : ["http:", "https:"].includes(origin.protocol) && (origin.host === request.headers.host
        || request.headers["sec-fetch-site"] === "same-origin")) return origin.origin;
  } catch {}
  throw new AppError(403, "Open the GradePath site before making this request.");
}

function limiter() {
  const limits = new Map();
  let lastClean = 0;
  return function limit(key, maximum, span) {
    const now = Date.now();
    if (now - lastClean > 60_000) {
      for (const [id, entry] of limits) if (entry.until <= now) limits.delete(id);
      lastClean = now;
    }
    const entry = limits.get(key);
    if (!entry || entry.until <= now) limits.set(key, { count: 1, until: now + span });
    else if (entry.count >= maximum) throw new AppError(429, "Too many requests. Wait a few minutes and try again.");
    else entry.count += 1;
  };
}

function credentials(input) {
  const email = clean(input.email, 120).toLowerCase();
  const password = typeof input.password === "string" ? input.password : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 10 || password.length > 128) {
    throw new AppError(400, "Enter an email address and a password between 10 and 128 characters.");
  }
  return { email, password };
}

export function createApp(config, fetcher = globalThis.fetch) {
  const db = createDatabase(config.database);
  const billing = createBilling(db, config.payment, fetcher);
  const tutor = createTutor(db, config.ai, billing, fetcher);
  const limit = limiter();

  function serviceStatus(user) {
    const allowance = user ? tutor.allowance(user.id) : null;
    return {
      online: true, aiConfigured: Boolean(config.ai.key), billingMode: config.payment.enabled ? config.payment.mode : "",
      inviteRequired: Boolean(config.inviteCode),
      account: user ? {
        email: user.email, billing: billing.summary(user.id),
        tutorRemaining: allowance.remaining, tutorLimit: allowance.limit
      } : null
    };
  }

  async function handle(request, response) {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    const { pathname } = new URL(request.url, "http://localhost");
    const { method } = request;
    if (staticFiles.has(pathname) && ["GET", "HEAD"].includes(method)) {
      const file = staticFiles.get(pathname);
      const data = await readFile(resolve(root, file));
      const type = file.split(".").at(-1);
      response.writeHead(200, {
        "Content-Type": contentTypes[type], "Content-Security-Policy": file === "runner.html" ? runnerPolicy : mainPolicy,
        "Cache-Control": "no-cache", "Content-Length": data.length
      });
      response.end(method === "HEAD" ? undefined : data);
      return;
    }
    if (!pathname.startsWith("/api/")) throw new AppError(404, "Page not found.");

    if (pathname === "/api/webhooks/paystack" && method === "POST") {
      await billing.webhook(await body(request, 250_000), request.headers["x-paystack-signature"]);
      json(response, 200, { received: true });
      return;
    }

    const origin = ["POST", "DELETE", "PUT"].includes(method) ? sameOrigin(request, config.publicOrigin) : "";
    const user = userFromSession(db, request);
    if (pathname === "/api/status" && method === "GET") {
      json(response, 200, serviceStatus(user));
      return;
    }
    if (["/api/register", "/api/login"].includes(pathname) && method === "POST") {
      const register = pathname === "/api/register";
      const ip = request.socket.remoteAddress || "unknown";
      limit((register ? "register-" : "login-") + ip, register ? 8 : 20, 600_000);
      const input = await jsonBody(request, 3000);
      const { email, password } = credentials(input);
      if (register && config.inviteCode) {
        const code = clean(input.invite, 120);
        if (!timingSafeEqual(Buffer.from(digest(code), "hex"), Buffer.from(digest(config.inviteCode), "hex"))) {
          throw new AppError(403, "Enter the invite code for this workspace.");
        }
      }
      const signedIn = register ? await createUser(db, email, password) : await verifyUser(db, email, password);
      if (user) clearSession(db, request, origin.startsWith("https:"));
      response.setHeader("Set-Cookie", issueSession(db, signedIn, origin.startsWith("https:")));
      json(response, register ? 201 : 200, serviceStatus(signedIn));
      return;
    }
    if (!user) throw new AppError(401, "Sign in to use this feature.");
    if (pathname === "/api/logout" && method === "POST") {
      response.setHeader("Set-Cookie", clearSession(db, request, origin.startsWith("https:")));
      json(response, 200, serviceStatus(null));
      return;
    }
    if (pathname === "/api/benchmark") {
      if (method === "GET") { json(response, 200, { result: getBenchmark(db, user.id) }); return; }
      if (method === "PUT") {
        limit("benchmark-" + user.id, 12, 60_000);
        const result = saveBenchmark(db, user.id, await jsonBody(request, 3500));
        json(response, 200, { result });
        return;
      }
      if (method === "DELETE") {
        db.prepare("DELETE FROM benchmarks WHERE user_id=?").run(user.id);
        json(response, 200, { result: null });
        return;
      }
    }
    if (pathname === "/api/tutor" && method === "POST") {
      limit("tutor-" + user.id, 8, 60_000);
      const result = await tutor.ask(user, await jsonBody(request));
      json(response, 200, { ...result, remaining: tutor.allowance(user.id).remaining });
      return;
    }
    if (pathname === "/api/billing/start" && method === "POST") {
      limit("checkout-" + user.id, 8, 60_000);
      json(response, 200, await billing.start(user, config.publicOrigin || origin));
      return;
    }
    if (pathname === "/api/billing/verify" && method === "POST") {
      limit("verify-" + user.id, 15, 60_000);
      const { reference } = await jsonBody(request, 2500);
      json(response, 200, await billing.verify(user, reference));
      return;
    }
    if (pathname === "/api/billing/manage" && method === "POST") {
      limit("manage-" + user.id, 8, 60_000);
      json(response, 200, await billing.manage(user));
      return;
    }
    throw new AppError(404, "Page not found.");
  }

  const server = createServer({ requestTimeout: 40_000, headersTimeout: 15_000 }, (request, response) => {
    handle(request, response).catch(error => {
      if (response.headersSent || response.destroyed) return;
      if (error instanceof AppError) json(response, error.status, { error: error.message });
      else {
        console.error("GradePath request failed:", error.code || error.name);
        json(response, 500, { error: "GradePath could not complete this request." });
      }
    });
  });
  server.on("close", () => db.close());
  return { server, db };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const envFile = resolve(root, ".env");
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  const { values } = parseArgs({ options: { host: { type: "string" }, port: { type: "string" }, strictPort: { type: "boolean" } } });
  const config = settings({ ...process.env, PORT: values.port || process.env.PORT, BIND_HOST: values.host || process.env.BIND_HOST });
  const { server } = createApp(config);
  server.listen(config.port, config.host, () => console.log("GradePath is ready at http://" + config.host + ":" + config.port));
}
