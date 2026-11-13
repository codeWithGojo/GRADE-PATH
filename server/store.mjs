import { DatabaseSync } from "node:sqlite";
import { createHash, randomBytes, randomUUID, scrypt as deriveKey, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const scrypt = promisify(deriveKey);
const sessionAge = 14 * 24 * 60 * 60;
const cookieName = "gradepath_session";
const benchmarkMin = 25;
const scryptSettings = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const clean = (value, max = 120) => typeof value === "string" ? value.trim().slice(0, max) : "";
export const digest = value => createHash("sha256").update(value).digest("hex");

export function transaction(db, callback) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = callback();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function createDatabase(path) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, salt TEXT NOT NULL, password_hash TEXT NOT NULL, created INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS workspace_backups (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      data TEXT NOT NULL, updated INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS benchmarks (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, school TEXT NOT NULL, programme TEXT NOT NULL,
      level TEXT NOT NULL, scale INTEGER NOT NULL, grading TEXT NOT NULL, cgpa INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS benchmark_cohort ON benchmarks(school, programme, level, scale, grading, cgpa);
    CREATE TABLE IF NOT EXISTS ai_uses (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      bucket TEXT NOT NULL, created INTEGER NOT NULL, outcome TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS usage_user ON ai_uses(user_id, bucket);
    CREATE INDEX IF NOT EXISTS usage_created ON ai_uses(created);
    CREATE TABLE IF NOT EXISTS checkouts (
      reference TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mode TEXT NOT NULL, plan TEXT NOT NULL, url TEXT, state TEXT NOT NULL, created INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS pending_checkout
      ON checkouts(user_id, mode, plan) WHERE state IN ('opening', 'pending');
    CREATE TABLE IF NOT EXISTS billing_customers (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, mode TEXT NOT NULL, plan TEXT NOT NULL,
      code TEXT NOT NULL, provider_id INTEGER, PRIMARY KEY(user_id, mode, plan), UNIQUE(mode, plan, code)
    );
    CREATE TABLE IF NOT EXISTS subscriptions (
      code TEXT NOT NULL, mode TEXT NOT NULL, plan TEXT NOT NULL, customer TEXT NOT NULL,
      status TEXT NOT NULL, created INTEGER NOT NULL, PRIMARY KEY(code, mode)
    );
    CREATE TABLE IF NOT EXISTS payments (
      reference TEXT NOT NULL, mode TEXT NOT NULL, plan TEXT NOT NULL, provider_id INTEGER,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, paid_at INTEGER NOT NULL, expires INTEGER NOT NULL,
      revoked INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(reference, mode)
    );
    CREATE INDEX IF NOT EXISTS payments_owner ON payments(user_id, mode, plan, paid_at);
  `);
  return db;
}

export async function createUser(db, email, password) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64, scryptSettings)).toString("hex");
  const user = { id: randomUUID(), email };
  const result = db.prepare(`
    INSERT INTO users VALUES (?, ?, ?, ?, ?) ON CONFLICT(email) DO NOTHING
  `).run(user.id, email, salt, hash, Date.now());
  if (!result.changes) throw new AppError(409, "An account already uses this email. Try signing in.");
  return user;
}

export async function verifyUser(db, email, password) {
  const user = db.prepare("SELECT id, email, salt, password_hash FROM users WHERE email = ?").get(email);
  const actual = await scrypt(password, user?.salt ?? "gradepath-missing-account", 64, scryptSettings);
  const expected = Buffer.from(user?.password_hash ?? "00".repeat(64), "hex");
  if (!timingSafeEqual(actual, expected) || !user) throw new AppError(401, "Email or password is incorrect.");
  return { id: user.id, email: user.email };
}

export function issueSession(db, user, secure) {
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  db.prepare("DELETE FROM sessions WHERE expires <= ?").run(now);
  db.prepare("INSERT INTO sessions VALUES (?, ?, ?)").run(digest(token), user.id, now + sessionAge * 1000);
  return sessionCookie(token, sessionAge, secure);
}

function sessionCookie(token, age, secure) {
  return cookieName + "=" + token + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=" + age + (secure ? "; Secure" : "");
}

export function sessionToken(request) {
  const value = request.headers.cookie?.split(";").map(part => part.trim())
    .find(part => part.startsWith(cookieName + "="))?.slice(cookieName.length + 1);
  return value && /^[\w-]{43}$/.test(value) ? value : "";
}

export function userFromSession(db, request) {
  const token = sessionToken(request);
  if (!token) return null;
  return db.prepare(`
    SELECT users.id, users.email FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.hash = ? AND sessions.expires > ?
  `).get(digest(token), Date.now()) ?? null;
}

export function clearSession(db, request, secure) {
  const token = sessionToken(request);
  if (token) db.prepare("DELETE FROM sessions WHERE hash = ?").run(digest(token));
  return sessionCookie("", 0, secure);
}

export function saveBenchmark(db, userId, input) {
  const school = clean(input.school, 90).replace(/\s+/g, " ");
  const programme = clean(input.programme, 80).replace(/\s+/g, " ");
  const level = clean(input.level, 3);
  const { scale, cgpa, points, replace, consent } = input;
  if (!school || !programme || !/^[1-7]00$/.test(level) || ![4, 5].includes(scale)
    || !Number.isFinite(cgpa) || cgpa < 0 || cgpa > scale || !Array.isArray(points)
    || points.length !== 6 || points.some(point => !Number.isFinite(point) || point < 0 || point > scale)
    || typeof replace !== "boolean" || consent !== true) {
    throw new AppError(400, "Enter your cohort, save your grades, and confirm consent to share your CGPA.");
  }
  const grading = JSON.stringify([points, replace]);
  db.prepare(`
    INSERT INTO benchmarks VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET school=excluded.school, programme=excluded.programme, level=excluded.level,
      scale=excluded.scale, grading=excluded.grading, cgpa=excluded.cgpa
  `).run(userId, school.toLowerCase(), programme.toLowerCase(), level, scale, grading, Math.round(cgpa * 100));
  return getBenchmark(db, userId);
}

export function getBenchmark(db, userId) {
  const own = db.prepare("SELECT * FROM benchmarks WHERE user_id = ?").get(userId);
  if (!own) return null;
  const cohort = db.prepare(`
    SELECT COUNT(*) AS count, COUNT(CASE WHEN cgpa > ? THEN 1 END) AS above,
      COUNT(CASE WHEN cgpa >= ? THEN 1 END) AS atOrAbove
    FROM benchmarks WHERE school = ? AND programme = ? AND level = ? AND scale = ? AND grading = ?
  `).get(own.cgpa, own.cgpa, own.school, own.programme, own.level, own.scale, own.grading);
  return {
    school: own.school, programme: own.programme, level: own.level, scale: own.scale, cgpa: own.cgpa / 100,
    count: cohort.count, minimum: benchmarkMin,
    rank: cohort.count >= benchmarkMin ? cohort.above + 1 : null,
    top: cohort.count >= benchmarkMin ? Math.ceil(100 * cohort.atOrAbove / cohort.count) : null
  };
}
