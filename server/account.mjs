import { randomBytes } from "node:crypto";
import { AppError, digest, transaction } from "./store.mjs";

const lifetime = { verify: 24 * 3_600_000, reset: 30 * 60_000 };

// Tokens are random, single-use and stored only as a SHA-256 digest.
export function issueToken(db, userId, purpose) {
  const token = randomBytes(32).toString("base64url");
  transaction(db, () => {
    db.prepare("DELETE FROM auth_tokens WHERE user_id=? AND purpose=?").run(userId, purpose);
    db.prepare("DELETE FROM auth_tokens WHERE expires<=?").run(Date.now());
    db.prepare("INSERT INTO auth_tokens VALUES (?, ?, ?, ?)").run(digest(token), userId, purpose, Date.now() + lifetime[purpose]);
  });
  return token;
}

export function consumeToken(db, token, purpose) {
  const hash = typeof token === "string" && /^[\w-]{43}$/.test(token) ? digest(token) : "";
  const userId = hash && transaction(db, () => {
    const row = db.prepare("SELECT user_id FROM auth_tokens WHERE hash=? AND purpose=? AND expires>?").get(hash, purpose, Date.now());
    if (row) db.prepare("DELETE FROM auth_tokens WHERE hash=?").run(hash);
    return row?.user_id ?? "";
  });
  if (!userId) throw new AppError(400, "This link is invalid or has expired. Request a new one.");
  return userId;
}

export function markVerified(db, userId) {
  db.prepare("UPDATE users SET email_verified=1 WHERE id=?").run(userId);
}

export function exportAccount(db, user) {
  const row = db.prepare("SELECT email, email_verified, created FROM users WHERE id=?").get(user.id);
  const workspace = db.prepare("SELECT data, updated FROM workspace_backups WHERE user_id=?").get(user.id);
  const benchmark = db.prepare("SELECT school, programme, level, scale, cgpa FROM benchmarks WHERE user_id=?").get(user.id);
  const tutorUses = db.prepare("SELECT COUNT(*) AS total FROM ai_uses WHERE user_id=? AND outcome='completed'").get(user.id).total;
  const payments = db.prepare("SELECT reference, mode, paid_at, expires, revoked FROM payments WHERE user_id=? ORDER BY paid_at").all(user.id);
  return {
    exportedAt: new Date().toISOString(),
    account: { email: row.email, emailVerified: Boolean(row.email_verified), created: new Date(row.created).toISOString() },
    workspace: workspace ? { updated: workspace.updated, backup: JSON.parse(workspace.data) } : null,
    benchmark: benchmark ? { ...benchmark, cgpa: benchmark.cgpa / 100 } : null,
    tutor: { completedRequests: tutorUses, note: "Tutor questions and answers are not stored by GradePath." },
    payments: payments.map(item => ({ ...item, revoked: Boolean(item.revoked) }))
  };
}

// Permanently removes the account. Child rows cascade; provider subscription rows are keyed by customer code, so clear them first.
export function deleteAccount(db, userId) {
  transaction(db, () => {
    db.prepare("DELETE FROM subscriptions WHERE customer IN (SELECT code FROM billing_customers WHERE user_id=?)").run(userId);
    db.prepare("DELETE FROM users WHERE id=?").run(userId);
  });
}
