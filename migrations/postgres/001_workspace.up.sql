BEGIN;
CREATE SCHEMA gradepath;
SET LOCAL search_path = gradepath, pg_catalog;
CREATE TABLE schema_migrations (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, salt TEXT NOT NULL, password_hash TEXT NOT NULL, created BIGINT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires BIGINT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS workspace_backups (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      data TEXT NOT NULL, updated BIGINT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS benchmarks (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, school TEXT NOT NULL, programme TEXT NOT NULL,
      level TEXT NOT NULL, scale BIGINT NOT NULL, grading TEXT NOT NULL, cgpa BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS benchmark_cohort ON benchmarks(school, programme, level, scale, grading, cgpa);
    CREATE TABLE IF NOT EXISTS ai_uses (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      bucket TEXT NOT NULL, created BIGINT NOT NULL, outcome TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS usage_user ON ai_uses(user_id, bucket);
    CREATE INDEX IF NOT EXISTS usage_created ON ai_uses(created);
    CREATE TABLE IF NOT EXISTS checkouts (
      reference TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mode TEXT NOT NULL, plan TEXT NOT NULL, url TEXT, state TEXT NOT NULL, created BIGINT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS pending_checkout
      ON checkouts(user_id, mode, plan) WHERE state IN ('opening', 'pending');
    CREATE TABLE IF NOT EXISTS billing_customers (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, mode TEXT NOT NULL, plan TEXT NOT NULL,
      code TEXT NOT NULL, provider_id BIGINT, PRIMARY KEY(user_id, mode, plan), UNIQUE(mode, plan, code)
    );
    CREATE TABLE IF NOT EXISTS subscriptions (
      code TEXT NOT NULL, mode TEXT NOT NULL, plan TEXT NOT NULL, customer TEXT NOT NULL,
      status TEXT NOT NULL, created BIGINT NOT NULL, PRIMARY KEY(code, mode)
    );
    CREATE TABLE IF NOT EXISTS payments (
      reference TEXT NOT NULL, mode TEXT NOT NULL, plan TEXT NOT NULL, provider_id BIGINT,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, paid_at BIGINT NOT NULL, expires BIGINT NOT NULL,
      revoked BIGINT NOT NULL DEFAULT 0, PRIMARY KEY(reference, mode)
    );
    CREATE INDEX IF NOT EXISTS payments_owner ON payments(user_id, mode, plan, paid_at);

  

    ALTER TABLE users ADD COLUMN email_verified BIGINT NOT NULL DEFAULT 0;
    CREATE TABLE auth_tokens (
      hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      purpose TEXT NOT NULL CHECK (purpose IN ('verify', 'reset')), expires BIGINT NOT NULL
    );
    CREATE INDEX auth_tokens_user ON auth_tokens(user_id, purpose);
  

ALTER TABLE users ADD COLUMN display_name text NOT NULL DEFAULT '', ADD COLUMN role text NOT NULL DEFAULT 'student' CHECK(role IN ('student','admin','educator'));
CREATE TABLE rate_limits (key text PRIMARY KEY, count integer NOT NULL, until_ms bigint NOT NULL);
CREATE INDEX rate_limits_expiry ON rate_limits(until_ms);
CREATE TABLE tutor_metrics (request_id text PRIMARY KEY REFERENCES ai_uses(id) ON DELETE CASCADE, input_tokens integer NOT NULL, output_tokens integer NOT NULL, latency_ms integer NOT NULL, cost_usd double precision);
INSERT INTO schema_migrations(version) VALUES (1);
COMMIT;
