/*
 * Setting unique constraints on delegates table
 */

BEGIN;

ALTER TABLE delegates ADD CONSTRAINT delegates_unique UNIQUE ("username", "transactionId");

COMMIT;
