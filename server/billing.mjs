import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { AppError, transaction } from "./store.mjs";

const amount = 100_000; // ₦1,000 in kobo.
const subscriptionStatuses = new Set(["active", "non-renewing", "attention", "completed", "cancelled"]);
const validReference = value => typeof value === "string" && /^[A-Za-z0-9.-]{4,120}$/.test(value);
const validSubscription = value => typeof value === "string" && /^SUB_[a-zA-Z0-9]+$/.test(value);
const isActiveSubscription = value => ["active", "non-renewing", "attention"].includes(value);

function nextMonth(timestamp) {
  const date = new Date(timestamp);
  const day = Math.min(28, date.getUTCDate());
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, day, date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
}

function hostedUrl(value, checkout = false) {
  try {
    const url = new URL(value);
    const host = checkout ? url.hostname === "checkout.paystack.com"
      : url.hostname === "paystack.com" || url.hostname.endsWith(".paystack.com");
    if (url.protocol === "https:" && host && !url.username && !url.password) return url.href;
  } catch {}
  throw new AppError(502, "Paystack did not return a usable hosted page.");
}

export function createBilling(db, config, fetcher) {
  const { enabled, key, mode, plan } = config;

  function requireConfig() {
    if (!enabled) throw new AppError(503, "Paystack is not configured. See README.md.");
  }

  async function api(path, body) {
    requireConfig();
    let response;
    let payload;
    try {
      response = await fetcher("https://api.paystack.co" + path, {
        method: body ? "POST" : "GET",
        headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(12_000)
      });
      payload = await response.json();
    } catch {
      throw new AppError(502, "Paystack did not respond. Check your connection and try again.");
    }
    if (!response.ok || payload?.status !== true) {
      const error = new AppError(502, "Paystack could not complete this request. Check your Paystack dashboard.");
      error.providerStatus = response.status;
      throw error;
    }
    return payload.data;
  }

  function currentPayment(userId) {
    return db.prepare(`
      SELECT paid_at, expires FROM payments WHERE user_id=? AND mode=? AND plan=? AND revoked=0
      ORDER BY expires DESC LIMIT 1
    `).get(userId, mode, plan);
  }

  function pending(userId) {
    return db.prepare(`
      SELECT reference, url, state, created FROM checkouts WHERE user_id=? AND mode=? AND plan=?
      AND state IN ('opening', 'pending') LIMIT 1
    `).get(userId, mode, plan);
  }

  function currentSubscription(userId) {
    return db.prepare(`
      SELECT subscriptions.code, subscriptions.status FROM subscriptions
      JOIN billing_customers ON subscriptions.customer = billing_customers.code
      AND subscriptions.mode = billing_customers.mode AND subscriptions.plan = billing_customers.plan
      WHERE billing_customers.user_id=? AND billing_customers.mode=? AND billing_customers.plan=?
      ORDER BY subscriptions.created DESC LIMIT 1
    `).get(userId, mode, plan);
  }

  function summary(userId) {
    const paid = enabled ? currentPayment(userId) : null;
    const sub = enabled ? currentSubscription(userId) : null;
    const intent = enabled ? pending(userId) : null;
    const active = Boolean(paid?.expires > Date.now());
    return {
      active, paidUntil: paid?.expires ?? null, paidAt: paid?.paid_at ?? null,
      canManage: Boolean(paid || sub),
      hasSubscription: Boolean(sub && isActiveSubscription(sub.status)),
      pending: intent?.reference ?? null, canContinue: Boolean(intent?.url)
    };
  }

  async function lookupPlan() {
    const data = await api("/plan/" + encodeURIComponent(plan));
    if (data?.plan_code !== plan || data.amount !== amount || data.interval !== "monthly" || data.currency !== "NGN") {
      throw new AppError(503, "Use a monthly NGN ₦1,000 plan in Paystack.");
    }
    return data;
  }

  async function start(user, origin) {
    requireConfig();
    const existing = summary(user.id);
    if (existing.active || existing.hasSubscription) throw new AppError(409, "Manage your existing subscription before opening another checkout.");
    const prior = pending(user.id);
    if (prior?.url) return { url: prior.url, reference: prior.reference };
    if (prior) throw new AppError(409, "A checkout is opening. Use Check payment status before trying again.");
    await lookupPlan();
    const reference = "gradepath-" + randomUUID();
    const reservation = transaction(db, () => {
      const concurrent = pending(user.id);
      if (concurrent) return concurrent;
      const current = summary(user.id);
      if (current.active || current.hasSubscription) throw new AppError(409, "You already have a subscription.");
      db.prepare("INSERT INTO checkouts VALUES (?, ?, ?, ?, NULL, 'opening', ?)").run(reference, user.id, mode, plan, Date.now());
      return null;
    });
    if (reservation?.url) return { url: reservation.url, reference: reservation.reference };
    if (reservation) throw new AppError(409, "A checkout is already opening.");
    try {
      const callback = new URL("/", origin);
      const data = await api("/transaction/initialize", {
        email: user.email, amount, currency: "NGN", plan, reference,
        callback_url: callback.href, metadata: { gradepath_checkout: reference }
      });
      if (data?.reference !== reference) throw new AppError(502, "The checkout reference could not be confirmed.");
      const url = hostedUrl(data.authorization_url, true);
      db.prepare("UPDATE checkouts SET url=?, state='pending' WHERE reference=? AND state='opening'").run(url, reference);
      return { url, reference };
    } catch (error) {
      if (error.providerStatus && error.providerStatus >= 400 && error.providerStatus < 500 && error.providerStatus !== 429) {
        db.prepare("UPDATE checkouts SET state='failed' WHERE reference=? AND state='opening'").run(reference);
      }
      throw error;
    }
  }

  async function verifiedCharge(reference) {
    if (!validReference(reference)) throw new AppError(400, "Invalid payment reference.");
    return api("/transaction/verify/" + encodeURIComponent(reference));
  }

  function recordCharge(userId, reference, data) {
    const paid = Date.parse(data.paid_at ?? data.paidAt ?? "");
    if (data.status !== "success" || data.reference !== reference || data.amount !== amount || data.currency !== "NGN"
      || (data.domain && data.domain !== mode) || !Number.isFinite(paid) || paid > Date.now() + 300_000) {
      throw new AppError(409, "This transaction does not match the GradePath Plus plan.");
    }
    db.prepare(`
      INSERT INTO payments(reference, mode, plan, provider_id, user_id, paid_at, expires)
      VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(reference, mode) DO NOTHING
    `).run(reference, mode, plan, Number.isSafeInteger(data.id) ? data.id : null, userId, paid, nextMonth(paid));
  }

  async function verify(user, reference) {
    requireConfig();
    if (!validReference(reference)) throw new AppError(400, "Invalid payment reference.");
    const intent = db.prepare(`
      SELECT state, created FROM checkouts WHERE reference=? AND user_id=? AND mode=? AND plan=?
    `).get(reference, user.id, mode, plan);
    if (!intent) throw new AppError(404, "This checkout does not belong to your account.");
    if (intent.state === "paid") return { status: "paid", ...summary(user.id) };

    let data;
    try {
      data = await verifiedCharge(reference);
    } catch (error) {
      if (error.providerStatus === 404 && intent.state === "opening" && Date.now() - intent.created > 900_000) {
        db.prepare("UPDATE checkouts SET state='failed' WHERE reference=? AND state='opening'").run(reference);
        return { status: "failed", ...summary(user.id) };
      }
      throw error;
    }

    if (data.status !== "success") {
      if (["failed", "reversed"].includes(data.status)) {
        db.prepare("UPDATE checkouts SET state='failed' WHERE reference=? AND state!='paid'").run(reference);
        return { status: "failed", ...summary(user.id) };
      }
      return { status: "pending", ...summary(user.id) };
    }

    const providerPlan = data.plan?.plan_code ?? (typeof data.plan === "string" ? data.plan : "");
    const customer = data.customer;
    if (customer?.email?.toLowerCase() !== user.email || !/^CUS_[a-zA-Z0-9]+$/.test(customer?.customer_code || "")
      || (providerPlan && providerPlan !== plan)) throw new AppError(409, "The payment does not match this account.");
    transaction(db, () => {
      recordCharge(user.id, reference, data);
      db.prepare(`
        INSERT INTO billing_customers VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id, mode, plan) DO UPDATE SET code=excluded.code, provider_id=excluded.provider_id
      `).run(user.id, mode, plan, customer.customer_code, Number.isSafeInteger(customer.id) ? customer.id : null);
      db.prepare("UPDATE checkouts SET state='paid' WHERE reference=?").run(reference);
    });
    return { status: "paid", ...summary(user.id) };
  }

  function saveSubscription(data, event = "") {
    const code = data?.subscription_code;
    const customer = data?.customer?.customer_code;
    const configuredPlan = data?.plan?.plan_code ?? data?.plan;
    if (!validSubscription(code) || !/^CUS_[a-zA-Z0-9]+$/.test(customer || "")
      || configuredPlan !== plan || (data.domain && data.domain !== mode)) return null;
    const rawStatus = event === "subscription.disable" ? "cancelled"
      : event === "subscription.not_renew" ? "non-renewing" : data.status;
    const status = subscriptionStatuses.has(rawStatus) ? rawStatus : "active";
    const timestamp = Date.parse(data.createdAt ?? data.created_at ?? "");
    db.prepare(`
      INSERT INTO subscriptions VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(code, mode) DO UPDATE SET status =
        CASE WHEN ? = 'subscription.create' THEN subscriptions.status ELSE excluded.status END
      WHERE subscriptions.plan=excluded.plan AND subscriptions.customer=excluded.customer
    `).run(code, mode, plan, customer, status, Number.isFinite(timestamp) ? timestamp : Date.now(), event);
    return { code, customer };
  }

  async function manage(user) {
    requireConfig();
    let sub = currentSubscription(user.id);
    if (!sub) {
      const customer = db.prepare("SELECT code, provider_id FROM billing_customers WHERE user_id=? AND mode=? AND plan=?")
        .get(user.id, mode, plan);
      if (!customer?.provider_id) throw new AppError(404, "No subscription was found for this account.");
      const remotePlan = await lookupPlan();
      const params = new URLSearchParams({ customer: customer.provider_id, plan: remotePlan.id, perPage: "25" });
      const records = await api("/subscription?" + params);
      for (const candidate of Array.isArray(records) ? records : []) {
        if (candidate?.customer?.customer_code === customer.code) saveSubscription(candidate);
      }
      sub = currentSubscription(user.id);
    }
    if (!sub) throw new AppError(404, "The subscription is still being confirmed. Check back shortly.");
    const data = await api("/subscription/" + encodeURIComponent(sub.code) + "/manage/link");
    return { url: hostedUrl(data?.link) };
  }

  async function webhook(raw, signature) {
    requireConfig();
    const received = typeof signature === "string" && /^[0-9a-f]{128}$/i.test(signature) ? Buffer.from(signature, "hex") : null;
    const expected = createHmac("sha512", key).update(raw).digest();
    if (!received || !timingSafeEqual(expected, received)) throw new AppError(401, "Invalid webhook signature.");
    let message;
    try { message = JSON.parse(raw.toString("utf8")); } catch { throw new AppError(400, "Invalid webhook payload."); }
    const { event, data } = message ?? {};
    if (!data || (data.domain && data.domain !== mode)) return;
    if (["subscription.create", "subscription.not_renew", "subscription.disable"].includes(event)) {
      saveSubscription(data, event);
      return;
    }
    if (event === "charge.success" && validReference(data.reference)) {
      const owner = db.prepare(`
        SELECT users.id, users.email FROM checkouts JOIN users ON users.id=checkouts.user_id
        WHERE checkouts.reference=? AND checkouts.mode=? AND checkouts.plan=?
      `).get(data.reference, mode, plan);
      if (owner) await verify(owner, data.reference);
      return;
    }
    if (event === "invoice.update" && data.paid === true && validReference(data.transaction?.reference)
      && validSubscription(data.subscription?.subscription_code)) {
      const code = data.subscription.subscription_code;
      const customer = data.customer?.customer_code;
      const owner = db.prepare("SELECT user_id FROM billing_customers WHERE code=? AND mode=? AND plan=?")
        .get(customer || "", mode, plan);
      if (!owner) return;
      let sub = db.prepare("SELECT customer FROM subscriptions WHERE code=? AND mode=? AND plan=?").get(code, mode, plan);
      if (!sub) {
        const info = await api("/subscription/" + encodeURIComponent(code));
        const matched = saveSubscription(info);
        if (matched?.code === code) sub = matched;
      }
      if (sub?.customer !== customer) return;
      const reference = data.transaction.reference;
      const recorded = db.prepare("SELECT 1 FROM payments WHERE reference=? AND mode=?").get(reference, mode);
      if (recorded) return;
      const charge = await verifiedCharge(reference);
      if (charge.customer?.customer_code !== customer) throw new AppError(409, "Renewal payment customer did not match.");
      recordCharge(owner.user_id, reference, charge);
      return;
    }
    if (event === "refund.processed" && data.amount >= amount) {
      const reference = data.transaction_reference ?? data.transaction?.reference;
      if (validReference(reference)) db.prepare("UPDATE payments SET revoked=1 WHERE reference=? AND mode=? AND plan=?").run(reference, mode, plan);
      else if (Number.isSafeInteger(data.transaction?.id)) db.prepare("UPDATE payments SET revoked=1 WHERE provider_id=? AND mode=? AND plan=?").run(data.transaction.id, mode, plan);
    }
  }

  return { summary, start, verify, manage, webhook };
}
