-- Perform garbage-collect on 'blocks' table, update statistics for query planner
-- Needs to be executed in order to keep high migration performance if migration is performed immediately after restoring from a snapshot
VACUUM(FULL, ANALYZE) blocks;
