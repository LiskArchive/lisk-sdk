BEGIN;

DO language plpgsql $$
BEGIN
	RAISE NOTICE 'Accounts migration, please wait...';
END
$$;

-- Insert data into 'accounts' table from 'mem_accounts' table
INSERT INTO accounts(address, public_key, balance)
	SELECT
		mem.address,
		mem."publicKey",
		mem.balance
	FROM mem_accounts mem;

-- Update all accounts with first transaction
UPDATE accounts AS a SET transaction_id = t.transaction_id
	FROM (
		SELECT
			t.transaction_id,
			t.recipient_address
		FROM transactions AS t
		GROUP BY t.recipient_address, t.transaction_id
	) AS t
	WHERE UPPER(t.recipient_address) = a.address;

--- Update all accounts with first transaction
UPDATE accounts AS a SET transaction_id = t.transaction_id
	FROM (
		SELECT
			t.transaction_id,
			t.sender_address
		FROM transactions AS t
		WHERE t.type = '2'
		GROUP BY t.recipient_address, t.transaction_id
	) AS t
	WHERE UPPER(t.sender_address) = a.address
	AND a.transaction_id IS NULL;

-- Update all accounts with public keys
UPDATE accounts AS a SET public_key_transaction_id = t.transaction_id
	FROM (
		SELECT
			t.transaction_id,
			t.sender_public_key
		FROM transactions AS t
		GROUP BY
			t.sender_public_key,
			t.transaction_id
	) AS t
	WHERE t.sender_public_key = a.public_key;

-- Update all accounts with transaction IDs
UPDATE accounts AS a SET transaction_id = t.transaction_id
	FROM (
		SELECT
			t.transaction_id,
			t.recipient_address
		FROM transactions AS t
		GROUP BY
			t.recipient_address,
			t.transaction_id
	) AS t
	WHERE t.recipient_address = a.address;

-- Create indexes
CREATE INDEX idx_accounts_public_key_transaction_id
ON accounts(public_key_transaction_id);

CREATE INDEX idx_accounts_address_upper
ON accounts(upper((address)::text));

CREATE INDEX idx_accounts_balance
ON accounts(balance);

COMMIT;
