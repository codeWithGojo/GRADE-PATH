/* Optional GradePath server. The browser can run the local study tools without it. */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { timingSafeEqual } from "node:crypto";
import { parseArgs } from "node:util";
import Core from "./core.js";
import { settings } from "./server/config.mjs";
import { postgres } from "./server/postgres.mjs";
import {
  AppError, clean, createDatabase, createUser, verifyUser, issueSession, userFromSession,
  clearSession, saveBenchmark, getBenchmark, digest, setPassword
} from "./server/store.mjs";
import { createTutor } from "./server/ai.mjs";
import { createBilling } from "./server/billing.mjs";
import { createMailer } from "./server/mailer.mjs";
import { issueToken, consumeToken, markVerified, exportAccount, deleteAccount } from "./server/account.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));
const staticFiles = new Map([
  ["/", "index.html"], ["/index.html", "index.html"], ["/styles.css", "styles.css"],
  ...["core", "catalog", "account-lifecycle-ui", "app", "grades", "study", "exams", "lab", "online", "school", "projects", "experience", "appearance"].map(name => ["/" + name + ".js", name + ".js"]),
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
      : ["http:", "https:"].includes(origin.protocol) && origin.host === request.headers.host) return origin.origin;
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

function emailOf(input) {
  const email = clean(input.email, 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError(400, "Enter a valid email address.");
  return email;
}

function passwordOf(value) {
  const password = typeof value === "string" ? value : "";
  if (password.length < 10 || password.length > 128) throw new AppError(400, "Use a password between 10 and 128 characters.");
  return password;
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
  const db = config.databaseUrl ? postgres(config.databaseUrl) : createDatabase(config.database);
  const billing = createBilling(db, config.payment, fetcher);
  const tutor = createTutor(db, config.ai, billing, fetcher);
  const localLimit = limiter();
  async function limit(key, maximum, span) {
    if (!config.databaseUrl) return localLimit(key, maximum, span);
    const now = Date.now();
    await db.prepare("DELETE FROM rate_limits WHERE until_ms<=?").run(now);
    const row = await db.prepare(`INSERT INTO rate_limits VALUES (?,1,?)
      ON CONFLICT(key) DO UPDATE SET count=rate_limits.count+1 RETURNING count`).get(digest(key), now + span);
    if (row.count > maximum) throw new AppError(429, "Too many requests. Try again later.");
  }
  const mailer = createMailer(config.mail ?? {}, fetcher);
  const clientIp = request => (config.trustProxy && String(request.headers["x-gradepath-client-ip"] || "").slice(0, 64))
    || request.socket.remoteAddress || "unknown";

  async function sendLink(user, purpose, origin) {
    const token = await issueToken(db, user.id, purpose);
    const base = (config.publicOrigin || origin) + "/#";
    const verify = purpose === "verify";
    return mailer.send({
      to: user.email,
      subject: verify ? "Confirm your GradePath email" : "Reset your GradePath password",
      text: (verify ? "Confirm your email for GradePath (valid for 24 hours):\n\n" + base + "verify=" + token
        : "Reset your GradePath password (valid for 30 minutes):\n\n" + base + "reset=" + token)
        + "\n\nIf you did not request this, you can ignore this email."
    });
  }

  async function serviceStatus(user) {
    const profile = user && await db.prepare("SELECT display_name,role,email_verified FROM users WHERE id=?").get(user.id);
    const allowance = user ? await tutor.allowance(user.id) : null;
    return {
      online: true, workspaceBackup: true, mailConfigured: mailer.enabled, aiConfigured: Boolean(config.ai.key), billingMode: config.payment.enabled ? config.payment.mode : "",
      inviteRequired: Boolean(config.inviteCode),
      account: user ? {
        id: user.id, email: user.email, name: profile.display_name, role: profile.role, emailVerified: Boolean(profile.email_verified),
        billing: await billing.summary(user.id),
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
    const user = await userFromSession(db, request);
    if (pathname === "/api/status" && method === "GET") {
      json(response, 200, await serviceStatus(user));
      return;
    }
    if (["/api/register", "/api/login"].includes(pathname) && method === "POST") {
      const register = pathname === "/api/register";
      const ip = clientIp(request);
      await limit((register ? "register-" : "login-") + ip, register ? 8 : 20, 600_000);
      const input = await jsonBody(request, 3000);
      const { email, password } = credentials(input);
      if (register && config.inviteCode) {
        const code = clean(input.invite, 120);
        if (!timingSafeEqual(Buffer.from(digest(code), "hex"), Buffer.from(digest(config.inviteCode), "hex"))) {
          throw new AppError(403, "Enter the invite code for this workspace.");
        }
      }
      const signedIn = register ? await createUser(db, email, password) : await verifyUser(db, email, password);
      if (register && mailer.enabled) await sendLink(signedIn, "verify", origin).catch(() => {});
      if (user) await clearSession(db, request, origin.startsWith("https:"));
      response.setHeader("Set-Cookie", await issueSession(db, signedIn, origin.startsWith("https:")));
      json(response, register ? 201 : 200, await serviceStatus(signedIn));
      return;
    }
    if (pathname === "/api/password/forgot" && method === "POST") {
      await limit("forgot-" + clientIp(request), 10, 600_000);
      if (!mailer.enabled) throw new AppError(503, "Password reset email is not set up yet.");
      const email = emailOf(await jsonBody(request, 1000));
      await limit("forgot-email-" + email, 3, 3_600_000);
      const account = await db.prepare("SELECT id, email FROM users WHERE email=?").get(email);
      if (account) await sendLink(account, "reset", origin);
      json(response, 200, { sent: true });
      return;
    }
    if (pathname === "/api/password/reset" && method === "POST") {
      await limit("reset-" + clientIp(request), 10, 600_000);
      const input = await jsonBody(request, 1000);
      const password = passwordOf(input.password);
      const userId = await consumeToken(db, input.token, "reset");
      await setPassword(db, userId, password);
      await markVerified(db, userId);
      json(response, 200, { reset: true });
      return;
    }
    if (pathname === "/api/account/verify" && method === "POST") {
      await limit("verify-email-" + clientIp(request), 20, 600_000);
      await markVerified(db, await consumeToken(db, (await jsonBody(request, 1000)).token, "verify"));
      json(response, 200, { verified: true });
      return;
    }
    if (!user) throw new AppError(401, "Sign in to use this feature.");
    if (pathname === "/api/account/verify/request" && method === "POST") {
      await limit("verify-request-" + user.id, 3, 3_600_000);
      if (!mailer.enabled) throw new AppError(503, "Verification email is not set up yet.");
      if ((await db.prepare("SELECT email_verified AS v FROM users WHERE id=?").get(user.id))?.v) { json(response, 200, { sent: false, verified: true }); return; }
      await sendLink(user, "verify", origin);
      json(response, 200, { sent: true });
      return;
    }
    if (pathname === "/api/account/profile" && method === "PUT") {
      const input = await jsonBody(request, 500);
      if (typeof input.name !== "string" || input.name.length > 60) throw new AppError(400, "Use a name of up to 60 characters.");
      await db.prepare("UPDATE users SET display_name=? WHERE id=?").run(clean(input.name, 60), user.id);
      json(response, 200, await serviceStatus(user));
      return;
    }
    if (pathname === "/api/account/export" && method === "GET") {
      await limit("export-" + user.id, 5, 600_000);
      response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store",
        "Content-Disposition": 'attachment; filename="gradepath-account.json"' });
      response.end(JSON.stringify(await exportAccount(db, user), null, 2));
      return;
    }
    if (pathname === "/api/account" && method === "DELETE") {
      await limit("delete-" + user.id, 5, 600_000);
      const input = await jsonBody(request, 1000);
      if (input.confirm !== true) throw new AppError(400, "Confirm that you want to permanently delete your account.");
      await verifyUser(db, user.email, typeof input.password === "string" ? input.password : "");
      if ((await billing.summary(user.id)).hasSubscription) {
        throw new AppError(409, "Cancel your GradePath Plus subscription from Manage subscription first, then delete your account.");
      }
      await deleteAccount(db, user.id);
      response.setHeader("Set-Cookie", await clearSession(db, request, origin.startsWith("https:")));
      json(response, 200, await serviceStatus(null));
      return;
    }
    if (pathname === "/api/logout" && method === "POST") {
      response.setHeader("Set-Cookie", await clearSession(db, request, origin.startsWith("https:")));
      json(response, 200, await serviceStatus(null));
      return;
    }
    if (pathname === "/api/workspace") {
      if (method === "GET") {
        const saved = await db.prepare("SELECT data, updated FROM workspace_backups WHERE user_id=?").get(user.id);
        json(response, 200, { owner: user.id, backup: saved ? JSON.parse(saved.data) : null, updated: saved?.updated ?? null });
        return;
      }
      if (method === "PUT") {
        await limit("workspace-" + user.id, 20, 60_000);
        const input = await jsonBody(request, 3_500_000);
        let data;
        try { data = Core.normalizeState(input.backup); }
        catch { throw new AppError(400, "Choose a valid GradePath backup."); }
        if (input.owner !== undefined && input.owner !== user.id) throw new AppError(409, "The signed-in account changed. Reload before syncing.");
        const base = input.base ?? null;
        if (base !== null && (!Number.isSafeInteger(base) || base < 1)) throw new AppError(400, "Invalid workspace revision.");
        const updated = Math.max(Date.now(), (base || 0) + 1);
        const snapshot = JSON.stringify(data);
        const result = base === null
          ? await db.prepare("INSERT INTO workspace_backups VALUES (?, ?, ?) ON CONFLICT(user_id) DO NOTHING").run(user.id, snapshot, updated)
          : await db.prepare("UPDATE workspace_backups SET data=?,updated=? WHERE user_id=? AND updated=?").run(snapshot, updated, user.id, base);
        if (!result.changes) throw new AppError(409, "Another device saved newer work. Export your local copy, then choose which workspace to keep.");
        json(response, 200, { updated });
        return;
      }
    }
    if (pathname === "/api/benchmark") {
      if (method === "GET") { json(response, 200, { result: await getBenchmark(db, user.id) }); return; }
      if (method === "PUT") {
        await limit("benchmark-" + user.id, 12, 60_000);
        const result = await saveBenchmark(db, user.id, await jsonBody(request, 3500));
        json(response, 200, { result });
        return;
      }
      if (method === "DELETE") {
        await db.prepare("DELETE FROM benchmarks WHERE user_id=?").run(user.id);
        json(response, 200, { result: null });
        return;
      }
    }
    if (pathname === "/api/tutor" && method === "POST") {
      await limit("tutor-" + user.id, 8, 60_000);
      const result = await tutor.ask(user, await jsonBody(request));
      json(response, 200, { ...result, remaining: (await tutor.allowance(user.id)).remaining });
      return;
    }
    if (pathname === "/api/billing/start" && method === "POST") {
      await limit("checkout-" + user.id, 8, 60_000);
      json(response, 200, await billing.start(user, config.publicOrigin || origin));
      return;
    }
    if (pathname === "/api/billing/verify" && method === "POST") {
      await limit("verify-" + user.id, 15, 60_000);
      const { reference } = await jsonBody(request, 2500);
      json(response, 200, await billing.verify(user, reference));
      return;
    }
    if (pathname === "/api/billing/manage" && method === "POST") {
      await limit("manage-" + user.id, 8, 60_000);
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
