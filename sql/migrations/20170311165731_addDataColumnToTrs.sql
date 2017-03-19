/*
 * Add 'data' column to 'trs' table 
 */

BEGIN;

ALTER TABLE "trs" ADD COLUMN "data" bytea;

COMMIT;
