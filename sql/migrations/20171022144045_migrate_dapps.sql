BEGIN;

DO language plpgsql $$
BEGIN
	RAISE NOTICE 'Dapps migration, please wait...';
END
$$;

/* Begin outtransfer migration */
ALTER TABLE outtransfer RENAME "transactionId" TO "transaction_id";
ALTER TABLE outtransfer RENAME "dappId" TO "dapp_id";
ALTER TABLE outtransfer RENAME "outTransactionId" TO "out_transaction_id";

/* Begin intransfer migration */
ALTER TABLE intransfer RENAME "dappId" TO "dapp_id";
ALTER TABLE intransfer RENAME "transactionId" TO "transaction_id";

/* Begin dapps migration */
ALTER TABLE dapps RENAME TO dapps_old;

CREATE TABLE "public".dapps(transaction_id varchar(20) NOT NULL,
  name varchar(32) NOT NULL,
  description varchar(160),
  tags varchar(160),
  LINK text, TYPE integer NOT NULL,
  category integer NOT NULL,
  icon text, owner_public_key bytea NOT NULL,
  CONSTRAINT pk_dapps_transaction_id PRIMARY KEY(transaction_id));

/* Populate new dapps table */
INSERT INTO "public".dapps(transaction_id, name, description, tags, LINK, TYPE, category, icon, owner_public_key)
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

  -- Dapps indexes
  CREATE INDEX idx_dapps_name
  ON "public".dapps ( name );

  CREATE INDEX idx_dapps_transactions_id
  ON "public".dapps ( "transaction_id" );

END;
