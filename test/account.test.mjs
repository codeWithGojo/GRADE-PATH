import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { createApp } from "../server.mjs";
import { settings } from "../server/config.mjs";
import { migrate, migrations } from "../server/migrations.mjs";

test("migrations apply once and upgrade a pre-runner database without losing users", () => {
  const db = new DatabaseSync(":memory:");
  migrate(db, migrations.slice(0, 1));
  db.prepare("INSERT INTO users VALUES ('u1', 'old@example.test', 's', 'h', 1)").run();
  migrate(db);
  migrate(db);
  assert.deepEqual(db.prepare("SELECT id FROM schema_migrations ORDER BY id").all().map(row => row.id), [1, 2, 3]);
  const user = db.prepare("SELECT email, email_verified FROM users").get();
  assert.equal(user.email, "old@example.test");
  assert.equal(user.email_verified, 0);
  assert.throws(() => migrate(db, [{ id: 4, name: "broken", sql: "CREATE TABLE x (" }]), /Migration 4/);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM schema_migrations").get().n, 3);
});

async function harness(overrides = {}) {
  const config = settings({ RESEND_API_KEY: "re_fixture", MAIL_FROM: "GradePath <accounts@example.test>", ...overrides });
  config.database = ":memory:";
  const emails = [];
  const { server, db } = createApp(config, async (target, request) => {
    assert.equal(new URL(target).hostname, "api.resend.com");
    emails.push(JSON.parse(request.body));
    return Response.json({ id: "fixture" });
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = "http://127.0.0.1:" + server.address().port;
  async function call(path, method = "GET", input, cookie = "", headers = {}) {
    const response = await fetch(origin + path, {
      method, headers: { Origin: origin, Cookie: cookie, ...headers, ...(input ? { "Content-Type": "application/json" } : {}) },
      body: input ? JSON.stringify(input) : undefined
    });
    const text = await response.text();
    return { code: response.status, data: text ? JSON.parse(text) : null, cookie: response.headers.get("set-cookie"), headers: response.headers };
  }
  const tokenFrom = mail => mail.text.match(/#(?:verify|reset)=([\w-]{43})/)[1];
  return { server, db, emails, call, tokenFrom, close: () => new Promise(resolve => server.close(resolve)) };
}

const password = "a-long-test-password";

test("password reset: single-use token, signs out every session, no account enumeration", async () => {
  const app = await harness();
  try {
    const registered = await app.call("/api/register", "POST", { email: "reset@example.test", password });
    const oldCookie = registered.cookie.split(";")[0];
    assert.equal(app.emails.length, 1, "registration sends a verification email");

    assert.equal((await app.call("/api/password/forgot", "POST", { email: "nobody@example.test" })).code, 200);
    assert.equal(app.emails.length, 1, "unknown email sends nothing but answers identically");
    assert.equal((await app.call("/api/password/forgot", "POST", { email: "reset@example.test" })).data.sent, true);
    const token = app.tokenFrom(app.emails.at(-1));
    assert.equal(app.emails.at(-1).to[0], "reset@example.test");

    assert.equal((await app.call("/api/password/reset", "POST", { token: "x".repeat(43), password: "another-long-password" })).code, 400);
    assert.equal((await app.call("/api/password/reset", "POST", { token, password: "short" })).code, 400);
    assert.equal((await app.call("/api/password/reset", "POST", { token, password: "another-long-password" })).code, 200);
    assert.equal((await app.call("/api/password/reset", "POST", { token, password: "third-long-password" })).code, 400, "token is single-use");

    assert.equal((await app.call("/api/workspace", "GET", undefined, oldCookie)).code, 401, "old session revoked");
    assert.equal((await app.call("/api/login", "POST", { email: "reset@example.test", password })).code, 401);
    assert.equal((await app.call("/api/login", "POST", { email: "reset@example.test", password: "another-long-password" })).code, 200);
  } finally { await app.close(); }
});

test("expired tokens are rejected and email verification updates status", async () => {
  const app = await harness();
  try {
    const registered = await app.call("/api/register", "POST", { email: "verify@example.test", password });
    const cookie = registered.cookie.split(";")[0];
    assert.equal((await app.call("/api/status", "GET", undefined, cookie)).data.account.emailVerified, false);
    const token = app.tokenFrom(app.emails[0]);
    app.db.prepare("UPDATE auth_tokens SET expires = 1").run();
    assert.equal((await app.call("/api/account/verify", "POST", { token })).code, 400);
    assert.equal((await app.call("/api/account/verify/request", "POST", {}, cookie)).data.sent, true);
    const fresh = app.tokenFrom(app.emails.at(-1));
    assert.equal((await app.call("/api/account/verify", "POST", { token: fresh })).data.verified, true);
    assert.equal((await app.call("/api/status", "GET", undefined, cookie)).data.account.emailVerified, true);
    assert.equal((await app.call("/api/account/verify/request", "POST", {}, cookie)).data.verified, true);
  } finally { await app.close(); }
});

test("export returns the user's own data; deletion needs password and confirmation, then erases everything", async () => {
  const app = await harness();
  try {
    const registered = await app.call("/api/register", "POST", { email: "gone@example.test", password });
    const cookie = registered.cookie.split(";")[0];
    await app.call("/api/register", "POST", { email: "stays@example.test", password });
    await app.call("/api/workspace", "PUT", { backup: { scale: 5, semesters: [] } }, cookie);

    const exported = await app.call("/api/account/export", "GET", undefined, cookie);
    assert.equal(exported.code, 200);
    assert.match(exported.headers.get("content-disposition"), /attachment/);
    assert.equal(exported.data.account.email, "gone@example.test");
    assert.equal(exported.data.workspace.backup.scale, 5);
    assert.equal(JSON.stringify(exported.data).includes("password"), false);
    assert.equal((await app.call("/api/account/export")).code, 401);

    assert.equal((await app.call("/api/account", "DELETE", { password }, cookie)).code, 400, "needs confirm");
    assert.equal((await app.call("/api/account", "DELETE", { password: "wrong-password-here", confirm: true }, cookie)).code, 401);
    const id = app.db.prepare("SELECT id FROM users WHERE email='gone@example.test'").get().id;
    app.db.prepare("INSERT INTO billing_customers VALUES (?, 'test', 'PLN_x', 'CUS_gone', 1)").run(id);
    app.db.prepare("INSERT INTO subscriptions VALUES ('SUB_gone', 'test', 'PLN_x', 'CUS_gone', 'cancelled', 0)").run();

    assert.equal((await app.call("/api/account", "DELETE", { password, confirm: true }, cookie)).code, 200);
    for (const table of ["sessions", "workspace_backups", "billing_customers", "auth_tokens"]) {
      assert.equal(app.db.prepare("SELECT COUNT(*) AS n FROM " + table + " WHERE user_id=?").get(id).n, 0, table);
    }
    assert.equal(app.db.prepare("SELECT COUNT(*) AS n FROM subscriptions").get().n, 0);
    assert.equal(app.db.prepare("SELECT COUNT(*) AS n FROM users").get().n, 1, "other accounts untouched");
    assert.equal((await app.call("/api/workspace", "GET", undefined, cookie)).code, 401);
  } finally { await app.close(); }
});

test("deletion is blocked while a Paystack subscription is active", async () => {
  const app = await harness({ PAYSTACK_SECRET_KEY: "sk_test_fixture", PAYSTACK_PLAN_CODE: "PLN_x" });
  try {
    const registered = await app.call("/api/register", "POST", { email: "paid@example.test", password });
    const cookie = registered.cookie.split(";")[0];
    const id = app.db.prepare("SELECT id FROM users").get().id;
    app.db.prepare("INSERT INTO billing_customers VALUES (?, 'test', 'PLN_x', 'CUS_paid', 1)").run(id);
    app.db.prepare("INSERT INTO subscriptions VALUES ('SUB_paid', 'test', 'PLN_x', 'CUS_paid', 'active', 0)").run();
    const blocked = await app.call("/api/account", "DELETE", { password, confirm: true }, cookie);
    assert.equal(blocked.code, 409);
    assert.equal(app.db.prepare("SELECT COUNT(*) AS n FROM users").get().n, 1);
  } finally { await app.close(); }
});

test("login rate limit ignores a spoofed client-IP header unless TRUST_PROXY is set", async () => {
  const app = await harness();
  try {
    await app.call("/api/register", "POST", { email: "rl@example.test", password });
    let last;
    for (let i = 0; i < 22; i++) {
      last = await app.call("/api/login", "POST", { email: "rl@example.test", password: "wrong-password-here" }, "", { "x-gradepath-client-ip": "10.0.0." + i });
    }
    assert.equal(last.code, 429, "spoofing different IPs does not dodge the limit");
  } finally { await app.close(); }
  const trusted = await harness({ TRUST_PROXY: "true" });
  try {
    await trusted.call("/api/register", "POST", { email: "rl@example.test", password });
    let last;
    for (let i = 0; i < 22; i++) {
      last = await trusted.call("/api/login", "POST", { email: "rl@example.test", password: "wrong-password-here" }, "", { "x-gradepath-client-ip": "10.0.0." + i });
    }
    assert.equal(last.code, 401, "each real client IP is limited separately behind a trusted gateway");
  } finally { await trusted.close(); }
});

test("without mail configuration, reset reports unavailable instead of pretending to send", async () => {
  const app = await harness({ RESEND_API_KEY: "", MAIL_FROM: "" });
  try {
    assert.equal((await app.call("/api/password/forgot", "POST", { email: "a@example.test" })).code, 503);
  } finally { await app.close(); }
});
