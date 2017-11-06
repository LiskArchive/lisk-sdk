BEGIN;

--Apply transactions into new table, to populate new accounts table
INSERT INTO "public".accounts(address, public_key, balance)
SELECT
  mem.address,
  mem."publicKey",
  mem.balance
FROM mem_accounts mem;

--UPDATE all accounts with first transaction
UPDATE "public".accounts AS a set transaction_id = t.id
FROM(
  SELECT t."id", t."recipientId"
  FROM transactions AS t group by t."recipientId", t."id"
) AS t
WHERE UPPER(t."recipientId") = a."address";

--UPDATE genesis transaction ID
UPDATE "public".accounts AS a set transaction_id = t.id
FROM(
  SELECT t."id", t."senderId"
  FROM transactions AS t WHERE t.type = '2'
  group by t."recipientId", t."id"
) AS t
WHERE UPPER(t."senderId") = a."address"
AND a.transaction_id IS NULL;

--UPDATE all acounts with publickeys
UPDATE "public".accounts AS a set public_key_transaction_id = t.id
FROM(
  SELECT t."id", t."senderPublicKey"
  FROM transactions AS t group by t."senderPublicKey", t."id"
) AS t
WHERE t."senderPublicKey" = a."public_key";

--UPDATE all acounts with transaction ids
UPDATE "public".accounts AS a set transaction_id = t.id
FROM(
  SELECT t."id", t."recipientId"
  FROM transactions AS t
	group by t."recipientId", t."id"
) AS t
WHERE t."recipientId" = a."address";

/* RENAME rounds_rewards columns */
ALTER TABLE rounds_rewards RENAME "pk" to "public_key";

/* RENAME transfers Stuff */
ALTER TABLE transfer RENAME "transactionId" TO "transaction_id";

/* Delegates Stuff */
ALTER TABLE delegates RENAME tx_id TO "transaction_id";
ALTER TABLE delegates RENAME pk TO "public_key";
ALTER TABLE delegates RENAME voters_cnt TO "voters_count";
ALTER TABLE delegates RENAME blocks_missed_cnt TO "blocks_missed_count";
ALTER TABLE delegates RENAME blocks_forged_cnt TO "blocks_forged_count";


/* Votes Details */
ALTER TABLE votes_details RENAME tx_id to transaction_id;
ALTER TABLE votes_details RENAME delegate_pk to delegate_public_key;

/* Votes */
ALTER TABLE votes RENAME TO votes_old;

CREATE TABLE "public".votes(transaction_id varchar(20) NOT NULL,
  public_key bytea NOT NULL,
  votes text NOT NULL);

--Populate votes table based on old data

INSERT INTO "public".votes(transaction_id, public_key, votes)
SELECT t."transaction_id",t."sender_public_key",v.votes
FROM votes_old v, transactions t
WHERE t."transaction_id" = v."transactionId";

CREATE TRIGGER vote_insert AFTER
INSERT ON votes
FOR EACH ROW EXECUTE PROCEDURE vote_insert();

CREATE OR REPLACE FUNCTION public.vote_insert() RETURNS TRIGGER LANGUAGE PLPGSQL AS $function$
BEGIN INSERT INTO votes_details
SELECT r.transaction_id, r.voter_address, (CASE WHEN substring(vote, 1, 1) = '+'
  THEN 'add'
  ELSE 'rem'
  END) AS type, r.timestamp, r.height, DECODE(substring(vote, 2), 'hex') AS delegate_public_key FROM(SELECT v.  "transaction_id"
  AS transaction_id, t."sender_address"
  AS voter_address, b.timestamp AS timestamp, b.height, regexp_split_to_table(v.votes, ',') AS vote FROM votes v, transactions t, blocks b
	WHERE v."transaction_id" = NEW."transaction_id"
  AND v."transaction_id" = t.transaction_id
	AND b.block_id = t."block_id") AS r ORDER BY r.timestamp ASC;
RETURN NULL;
END $function$;

/* Begin second signature migration */
CREATE TABLE "public".second_signature(transaction_id varchar(20) NOT NULL,
  public_key bytea NOT NULL,
  second_public_key bytea NOT NULL,
  CONSTRAINT pk_second_signature PRIMARY KEY(public_key));


INSERT INTO second_signature(transaction_id, public_key, second_public_key)
SELECT t.transaction_id,
  t."sender_public_key",
  ma."secondPublicKey"
FROM "public".transactions t,  mem_accounts ma
WHERE ma."secondPublicKey"
IS NOT NULL
AND t."sender_address" = ma."address"
AND t.type = 1;

/* Begin multisignatures migration */
CREATE TABLE "public".multisignatures_master(transaction_id varchar(20) NOT NULL,
  public_key bytea NOT NULL,
  lifetime smallint NOT NULL,
  minimum smallint NOT NULL,
  CONSTRAINT pk_multisignatures_master PRIMARY KEY(public_key));


CREATE TABLE "public".multisignatures_member(transaction_id varchar(20) NOT NULL,
  public_key text NOT NULL, --I need to be bytea master_public_key bytea NOT NULL,
  CONSTRAINT pk_multisignature_members UNIQUE(master_public_key,
    public_key));

/* Populates multisignatures master table FROM blockchain */
INSERT INTO "public".multisignatures_master(transaction_id, public_key, minimum, lifetime)
SELECT t."id",
t."senderPublicKey",
ma."multimin",
ma."multilifetime"
FROM mem_accounts ma, trs t
WHERE t."type" = 4
AND t."senderPublicKey" = ma."publicKey";

/* Populates multisignatures member FROM blockchain */
INSERT INTO "public".multisignatures_member(transaction_id, public_key, master_public_key)
SELECT mma."transaction_id",
  ENCODE(substring(regexp_split_to_table(ms.keysgroup, E ','), 'hex') FROM 2 FOR 64),
  mma.public_key
FROM multisignatures ms, multisignatures_master mma
WHERE mma."transaction_id" = ms."transactionId";

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

END;
