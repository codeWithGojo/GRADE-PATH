import { resolve } from "node:path";

function int(raw, fallback, min, max, name) {
  const value = raw ? Number(raw) : fallback;
  if (!Number.isInteger(value) || value < min || value > max) throw new Error("Set " + name + " between " + min + " and " + max + ".");
  return value;
}

export function settings(env = process.env) {
  const port = int(env.PORT, 3000, 1, 65535, "PORT");
  const host = env.BIND_HOST || "127.0.0.1";
  const publicOrigin = env.PUBLIC_URL ? new URL(env.PUBLIC_URL).origin : "";
  if (publicOrigin && !publicOrigin.startsWith("https://") && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(publicOrigin)) {
    throw new Error("Use an HTTPS PUBLIC_URL when hosting GradePath publicly.");
  }
  const paymentMode = env.PAYSTACK_MODE || "test";
  if (!["test", "live"].includes(paymentMode)) throw new Error("Set PAYSTACK_MODE to test or live.");
  const paymentKey = env.PAYSTACK_SECRET_KEY?.trim() || "";
  const paymentPlan = env.PAYSTACK_PLAN_CODE?.trim() || "";
  if (paymentKey && !paymentKey.startsWith("sk_" + paymentMode + "_")) throw new Error("Use a Paystack secret key for your configured mode.");
  if (paymentPlan && !/^PLN_[a-zA-Z0-9]+$/.test(paymentPlan)) throw new Error("PAYSTACK_PLAN_CODE must be a Paystack plan code.");
  if (paymentMode === "live" && paymentKey && !publicOrigin.startsWith("https://")) {
    throw new Error("Set PUBLIC_URL to your public HTTPS origin before enabling live payments.");
  }
  return {
    host, port, publicOrigin, database: resolve(env.DATA_DIR || "./data", "gradepath.sqlite"),
    inviteCode: env.SIGNUP_INVITE_CODE || "",
    ai: {
      key: env.OPENAI_API_KEY?.trim() || "", model: env.OPENAI_MODEL || "gpt-4.1-mini",
      plusLimit: int(env.AI_PLUS_LIMIT, 60, 1, 1000, "AI_PLUS_LIMIT"),
      dailyLimit: int(env.AI_DAILY_LIMIT, 150, 1, 10000, "AI_DAILY_LIMIT")
    },
    payment: { key: paymentKey, plan: paymentPlan, mode: paymentMode, enabled: Boolean(paymentKey && paymentPlan && (paymentMode === "test" || env.GRADEPATH_ENABLE_LIVE_PAYMENTS === "true")) }
  };
}
