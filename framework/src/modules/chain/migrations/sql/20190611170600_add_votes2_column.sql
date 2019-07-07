ALTER TABLE "mem_accounts" ADD COLUMN IF NOT EXISTS "vote_new" BIGINT;

UPDATE "mem_accounts" SET "vote_new" = "vote";
