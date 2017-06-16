/*
 * Recreate 'delegates' table to get rid of duplicated entries
 */

BEGIN;

ALTER TABLE delegates ADD CONSTRAINT delegates_unique UNIQUE ("username", "transactionId");

COMMIT;
