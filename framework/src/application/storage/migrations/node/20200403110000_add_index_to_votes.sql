CREATE INDEX IF NOT EXISTS "mem_accounts_votes" ON "mem_accounts" USING gin ("votes");
