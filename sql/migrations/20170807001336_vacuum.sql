-- Perform garbage-collect on 'blocks' table, update statistics for query planner
-- Need to be executed to keep high migration performance if migration is performed right after restore from snapshot
VACUUM(FULL, ANALYZE) blocks;