BEGIN;

DO language plpgsql $$
BEGIN
	RAISE NOTICE 'Transfers table migration, please wait...';
END
$$;

/* RENAME transfers Stuff */
ALTER TABLE transfer RENAME "transactionId" TO "transaction_id";

END;
