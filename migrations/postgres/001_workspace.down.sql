-- Destructive rollback of this application schema. Export account data before running.
BEGIN;
DROP SCHEMA gradepath CASCADE;
COMMIT;
