/*
 * Add 'data' column to 'trs' table 
 */

BEGIN;

ALTER TABLE "trs" ADD COLUMN "data" VARCHAR(16);

COMMIT;
