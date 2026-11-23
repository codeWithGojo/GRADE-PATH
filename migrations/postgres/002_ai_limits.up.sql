BEGIN;
CREATE TABLE gradepath.ai_limits (tier text PRIMARY KEY CHECK(tier IN ('free','plus','admin')), allowance integer NOT NULL CHECK(allowance BETWEEN 0 AND 10000));
INSERT INTO gradepath.schema_migrations(version) VALUES(2);
COMMIT;
