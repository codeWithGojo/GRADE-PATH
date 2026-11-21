// Versioned schema migrations. Never edit an applied migration: add a new one.
// Migration 1 is the original schema (IF NOT EXISTS), so databases created
// before the runner existed are adopted without changes.
const migrations = [
  {
    id: 1, name: "baseline",
    sql: `
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

  `
  },
  {
    id: 2, name: "account_lifecycle",
    sql: `
    ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;
    CREATE TABLE auth_tokens (
      hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      purpose TEXT NOT NULL CHECK (purpose IN ('verify', 'reset')), expires INTEGER NOT NULL
    );
    CREATE INDEX auth_tokens_user ON auth_tokens(user_id, purpose);
  `
  }
];

export function migrate(db, list = migrations) {
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (id INTEGER PRIMARY KEY, name TEXT NOT NULL, applied INTEGER NOT NULL)");
  const done = new Set(db.prepare("SELECT id FROM schema_migrations").all().map(row => row.id));
  for (const step of list) {
    if (done.has(step.id)) continue;
    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec(step.sql);
      db.prepare("INSERT INTO schema_migrations VALUES (?, ?, ?)").run(step.id, step.name, Date.now());
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw new Error("Migration " + step.id + " (" + step.name + ") failed: " + error.message);
    }
  }
}

export { migrations };
