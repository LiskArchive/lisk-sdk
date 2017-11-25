BEGIN;

DO language plpgsql $$
BEGIN
	RAISE NOTICE 'Transfers table migration, please wait...';
END
$$;

-- Rename columns on 'transfer' table
ALTER TABLE transfer RENAME "transactionId" TO transaction_id;

COMMIT;
