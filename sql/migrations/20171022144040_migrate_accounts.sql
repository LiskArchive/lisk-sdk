BEGIN;

DO language plpgsql $$
BEGIN
	RAISE NOTICE 'Accounts migration, please wait...';
END
$$;

--Apply transactions into new table, to populate new accounts table
INSERT INTO "public".accounts(address, public_key, balance)
SELECT
  mem.address,
  mem."publicKey",
  mem.balance
FROM mem_accounts mem;

--UPDATE all accounts with first transaction
UPDATE "public".accounts AS a set transaction_id = t.transaction_id
FROM(
  SELECT t."transaction_id", t."recipient_address"
  FROM transactions AS t group by t."recipient_address", t."transaction_id"
) AS t
WHERE UPPER(t."recipient_address") = a."address";

--UPDATE genesis transaction ID
UPDATE "public".accounts AS a set transaction_id = t.transaction_id
FROM(
  SELECT t."transaction_id", t."sender_address"
  FROM transactions AS t WHERE t.type = '2'
  group by t."recipient_address", t."transaction_id"
) AS t
WHERE UPPER(t."sender_address") = a."address"
AND a.transaction_id IS NULL;

--UPDATE all acounts with publickeys
UPDATE "public".accounts AS a set public_key_transaction_id = t.transaction_id
FROM(
  SELECT t."transaction_id", t."sender_public_key"
  FROM transactions AS t group by t."sender_public_key", t."transaction_id"
) AS t
WHERE t."sender_public_key" = a."public_key";

--UPDATE all acounts with transaction ids
UPDATE "public".accounts AS a set transaction_id = t.transaction_id
FROM(
  SELECT t."transaction_id", t."recipient_address"
  FROM transactions AS t
	group by t."recipient_address", t."transaction_id"
) AS t
WHERE t."recipient_address" = a."address";


-- Create new indexes
  CREATE INDEX idx_accounts_public_key_transaction_id
  ON "public".accounts( public_key_transaction_id );

  CREATE INDEX idx_accounts_address_upper
  ON "public".accounts( upper((address)::text) );

  CREATE INDEX idx_accounts_balance
  ON "public".accounts( balance );

END;
