BEGIN;

DO language plpgsql $$
BEGIN
	RAISE NOTICE 'Dapps migration, please wait...';
END
$$;

-- Rename columns on 'outtransfer' table
ALTER TABLE outtransfer RENAME "transactionId" TO "transaction_id";
ALTER TABLE outtransfer RENAME "dappId" TO "dapp_id";
ALTER TABLE outtransfer RENAME "outTransactionId" TO "out_transaction_id";

-- Rename columns on 'intransfer' table
ALTER TABLE intransfer RENAME "dappId" TO "dapp_id";
ALTER TABLE intransfer RENAME "transactionId" TO "transaction_id";

-- Rename 'dapps' table to 'dapps_old'
ALTER TABLE dapps RENAME TO dapps_old;

CREATE TABLE dapps(
	transaction_id varchar(20) NOT NULL,
	name varchar(32) NOT NULL,
	description varchar(160),
	tags varchar(160),
	LINK text, TYPE integer NOT NULL,
	category integer NOT NULL,
	icon text, owner_public_key bytea NOT NULL,
	CONSTRAINT pk_dapps_transaction_id PRIMARY KEY(transaction_id)
);

-- Insert data into 'dapps' table from 'transactions' table
INSERT INTO dapps(transaction_id, name, description, tags, LINK, TYPE, category, icon, owner_public_key)
	SELECT DISTINCT d."transactionId",
		d.name,
		d.description,
		d.tags,
		d.link,
		d.type,
		d.category,
		d.icon,
		t."sender_public_key"
	FROM transactions t,dapps_old d
	WHERE t.type = 5
	AND d."transactionId" = t."transaction_id";

-- Create indexes
CREATE INDEX idx_dapps_name
ON dapps(name);

CREATE INDEX idx_dapps_transactions_id
ON dapps(transaction_id);

COMMIT;
