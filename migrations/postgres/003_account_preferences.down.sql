BEGIN;
DROP TABLE gradepath.email_changes;
ALTER TABLE gradepath.users DROP COLUMN study_profile;
DELETE FROM gradepath.schema_migrations WHERE version=3;
COMMIT;
