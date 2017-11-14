BEGIN;

DO language plpgsql $$
BEGIN
	RAISE NOTICE 'Multisignatures migration, please wait...';
END
$$;

/* Begin multisignatures migration */
CREATE TABLE "public".multisignatures_master(transaction_id varchar(20) NOT NULL,
  public_key BYTEA NOT NULL,
  lifetime smallint NOT NULL,
  minimum smallint NOT NULL,
  keysgroup TEXT NOT NULL,
  CONSTRAINT pk_multisignatures_master PRIMARY KEY(public_key));

CREATE TABLE "public".multisignatures_member(
	transaction_id varchar(20) NOT NULL,
    public_key BYTEA NOT NULL,
	master_public_key BYTEA NOT NULL,
  CONSTRAINT pk_multisignature_members UNIQUE(master_public_key, public_key)
);


CREATE OR REPLACE FUNCTION public.multisignatures_insert() RETURNS TRIGGER LANGUAGE PLPGSQL AS $function$
BEGIN INSERT INTO multisignatures_member
SELECT
  NEW.transaction_id AS  transaction_id,
  DECODE(substring(r.multisignatures_member, 2), 'hex') AS public_key,
  r.master_public_key AS master_public_key
  FROM(SELECT mm."transaction_id"  AS transaction_id, mm."public_key" AS master_public_key, regexp_split_to_table(mm.keysgroup, ',') AS multisignatures_member FROM multisignatures_master mm
  WHERE
    NEW.transaction_id = mm.transaction_id) as r;
RETURN NULL;
END $function$;

CREATE TRIGGER multisignatures_insert AFTER
INSERT ON multisignatures_master
FOR EACH ROW EXECUTE PROCEDURE multisignatures_insert();

/* Populates multisignatures master table FROM blockchain */
INSERT INTO "public".multisignatures_master(transaction_id, public_key, minimum, lifetime, keysgroup)
SELECT t."transaction_id",
t."sender_public_key",
ma."multimin",
ma."multilifetime",
ms."keysgroup"
FROM mem_accounts ma, transactions t, multisignatures ms
WHERE t."type" = 4
AND t."sender_public_key" = ma."publicKey"
AND ms."transactionId" = t."transaction_id";

  -- Multisignatures indexes
  CREATE INDEX idx_multisignatures_master_transaction_id
  ON "public".multisignatures_master ( "transaction_id" );

  CREATE INDEX idx_multisignatures_master_public_key
  ON "public".multisignatures_master ( public_key );

  CREATE INDEX idx_multisignatures_member_transaction_id
  ON "public".multisignatures_member ( "transaction_id" );

  CREATE INDEX idx_multisignatures_member_public_key
  ON "public".multisignatures_member ( public_key );

END;
