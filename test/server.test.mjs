import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createApp } from "../server.mjs";
import { settings } from "../server/config.mjs";

test("accounts, opt-in benchmarks, metered tutoring, and verified subscription renewals", async () => {
  const config = settings({ OPENAI_API_KEY: "mock", PAYSTACK_SECRET_KEY: "sk_test_fixture", PAYSTACK_PLAN_CODE: "PLN_fixture" });
  config.database = ":memory:";
  const key = config.payment.key;
  const plan = { id: 1, plan_code: config.payment.plan, amount: 100000, currency: "NGN", interval: "monthly" };
  const customer = { id: 2, customer_code: "CUS_fixture", email: "learner@example.test" };
  const subscription = { subscription_code: "SUB_fixture", status: "active", plan, customer };
  const transactions = new Map();
  let aiCalls = 0;
  let checkoutCalls = 0;

  const { server, db } = createApp(config, async (target, request) => {
    const url = new URL(target);
    if (url.hostname === "api.openai.com") {
      const data = JSON.parse(request.body);
      assert.equal(data.store, false);
      assert.equal(data.text.format.strict, true);
      const input = JSON.parse(data.input);
      assert.equal(input.extracts[0].location, "Page 2");
      aiCalls += 1;
      return Response.json({ output: [{ content: [{ type: "output_text", text: JSON.stringify({
        answer: "A time quantum limits a process’s turn.", citations: ["S1", "invalid"], questions: []
      }) }] }] });
    }
    if (url.pathname.startsWith("/plan/")) return Response.json({ status: true, data: plan });
    if (url.pathname === "/transaction/initialize") {
      checkoutCalls += 1;
      const data = JSON.parse(request.body);
      assert.equal(data.amount, 100000);
      assert.equal(data.plan, plan.plan_code);
      assert.equal(data.email, customer.email);
      transactions.set(data.reference, {
        id: 5, status: "success", domain: "test", reference: data.reference,
        amount: 100000, currency: "NGN", plan, customer, paid_at: new Date(Date.now() - 86_400_000).toISOString()
      });
      return Response.json({ status: true, data: { reference: data.reference, authorization_url: "https://checkout.paystack.com/fixture" } });
    }
    if (url.pathname.startsWith("/transaction/verify/")) {
      return Response.json({ status: true, data: transactions.get(url.pathname.split("/").at(-1)) });
    }
    if (url.pathname === "/subscription/SUB_fixture/manage/link") {
      return Response.json({ status: true, data: { link: "https://paystack.com/manage/fixture" } });
    }
    throw new Error("Unexpected fixture request");
  });

  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = "http://127.0.0.1:" + server.address().port;
  let cookie = "";
  async function request(path, method = "GET", input, extra = {}) {
    const { responseOrigin = origin, authorization = cookie } = extra;
    const response = await fetch(origin + path, {
      method,
      headers: { Origin: responseOrigin, Cookie: authorization, ...(input ? { "Content-Type": "application/json" } : {}) },
      body: input ? JSON.stringify(input) : undefined
    });
    return { code: response.status, data: await response.json(), cookie: response.headers.get("set-cookie") };
  }
  async function webhook(event, data, signed = true) {
    const raw = JSON.stringify({ event, data });
    const signature = signed ? createHmac("sha512", key).update(raw).digest("hex") : "00".repeat(64);
    return fetch(origin + "/api/webhooks/paystack", {
      method: "POST", headers: { "Content-Type": "application/json", "x-paystack-signature": signature }, body: raw
    });
  }

  try {
    assert.equal((await fetch(origin + "/")).status, 200);
    assert.equal((await fetch(origin + "/.env")).status, 404);
    assert.equal((await fetch(origin + "/exams.js")).status, 200);
    assert.equal((await request("/api/tutor", "POST", {})).code, 401);
    assert.equal((await request("/api/register", "POST", {}, { responseOrigin: "https://elsewhere.test" })).code, 403);
    const registered = await request("/api/register", "POST", { email: customer.email, password: "a-long-test-password" });
    assert.equal(registered.code, 201);
    assert.match(registered.cookie, /HttpOnly; SameSite=Lax/);
    cookie = registered.cookie.split(";")[0];

    const cohort = { school: "Example University", programme: "Computing", level: "200", scale: 5, cgpa: 4.6,
      points: [5, 4, 3, 2, 1, 0], replace: false };
    assert.equal((await request("/api/benchmark", "PUT", cohort)).code, 400);
    assert.equal((await request("/api/benchmark", "PUT", { ...cohort, consent: true })).data.result.rank, null);
    for (let i = 1; i < 25; i++) {
      db.prepare("INSERT INTO users VALUES (?, ?, '', '', 0)").run("peer" + i, "peer" + i + "@example.test");
      db.prepare("INSERT INTO benchmarks VALUES (?, 'example university', 'computing', '200', 5, ?, ?)")
        .run("peer" + i, JSON.stringify([cohort.points, false]), i === 1 ? 460 : 350);
    }
    const rank = (await request("/api/benchmark")).data.result;
    assert.equal(rank.count, 25);
    assert.equal(rank.rank, 1);
    assert.equal(rank.top, 8);
    assert.equal((await request("/api/benchmark", "DELETE")).data.result, null);

    const prompt = { mode: "notes", question: "What is a time quantum?",
      extracts: [{ number: 2, kind: "pdf", title: "OS", text: "A time quantum limits each turn on the CPU." }] };
    const trial = await request("/api/tutor", "POST", prompt);
    assert.equal(trial.code, 200);
    assert.equal(trial.data.sources.length, 1);
    assert.equal(trial.data.remaining, 0);
    assert.equal((await request("/api/tutor", "POST", prompt)).code, 402);

    const checkout = (await request("/api/billing/start", "POST", {})).data;
    assert.equal(checkout.url, "https://checkout.paystack.com/fixture");
    assert.equal((await request("/api/billing/start", "POST", {})).data.reference, checkout.reference);
    assert.equal(checkoutCalls, 1);
    assert.equal((await webhook("subscription.create", subscription, false)).status, 401);
    assert.equal((await webhook("subscription.create", subscription)).status, 200);
    const verified = await request("/api/billing/verify", "POST", { reference: checkout.reference });
    assert.equal(verified.data.active, true);
    assert.equal((await request("/api/billing/verify", "POST", { reference: checkout.reference })).data.paidUntil, verified.data.paidUntil);
    assert.equal((await request("/api/billing/start", "POST", {})).code, 409);
    assert.equal((await request("/api/billing/manage", "POST", {})).data.url, "https://paystack.com/manage/fixture");
    assert.equal((await request("/api/tutor", "POST", prompt)).data.remaining, 59);
    assert.equal(aiCalls, 2);

    const reference = "gradepath-renewal-test";
    transactions.set(reference, {
      ...transactions.get(checkout.reference), id: 6, reference, paid_at: new Date().toISOString()
    });
    const invoice = { paid: true, customer, subscription, transaction: { reference } };
    assert.equal((await webhook("invoice.update", invoice)).status, 200);
    const renewed = (await request("/api/status")).data.account.billing.paidUntil;
    assert(renewed > verified.data.paidUntil);
    await webhook("invoice.update", invoice);
    assert.equal((await request("/api/status")).data.account.billing.paidUntil, renewed);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM payments").get().count, 2);
    assert.equal((await webhook("refund.processed", { amount: 100000, transaction_reference: reference })).status, 200);
    assert.equal((await request("/api/status")).data.account.billing.paidUntil, verified.data.paidUntil);

    assert.equal((await request("/api/logout", "POST", {})).data.account, null);
    assert.equal((await request("/api/status")).data.account, null);
    const signedIn = await request("/api/login", "POST", { email: customer.email, password: "a-long-test-password" });
    assert.equal(signedIn.code, 200);
    assert.equal(signedIn.data.account.email, customer.email);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
