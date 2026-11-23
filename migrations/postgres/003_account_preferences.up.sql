BEGIN;
ALTER TABLE gradepath.users ADD COLUMN study_profile text NOT NULL DEFAULT '{}';
CREATE TABLE gradepath.email_changes (user_id text PRIMARY KEY REFERENCES gradepath.users(id) ON DELETE CASCADE, email text NOT NULL, hash text NOT NULL UNIQUE, expires bigint NOT NULL);
INSERT INTO gradepath.schema_migrations(version) VALUES(3);
COMMIT;
