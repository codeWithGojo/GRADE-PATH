BEGIN;
DROP TABLE gradepath.ai_limits;
DELETE FROM gradepath.schema_migrations WHERE version=2;
COMMIT;
