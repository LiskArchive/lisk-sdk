/*
 * Recalculate 'mem_accounts' table from actual blockchain
 */

BEGIN;

-- Recalculate balances
WITH last_round AS (SELECT height FROM blocks WHERE height % 101 = 0 ORDER BY height DESC LIMIT 1),
rewards AS (SELECT SUM(reward) AS rewards FROM blocks WHERE height <= (SELECT * FROM last_round)),
fees AS (SELECT SUM(fees) AS fees FROM rounds_fees),
balances AS (
  (SELECT UPPER("senderId") AS address, -SUM(amount+fee) AS amount FROM trs GROUP BY UPPER("senderId"))
    UNION ALL
  (SELECT UPPER("recipientId") AS address, SUM(amount) AS amount FROM trs WHERE "recipientId" IS NOT NULL GROUP BY UPPER("recipientId"))
  UNION ALL
  (SELECT a.address, f.fees AS amount FROM
  (SELECT "publicKey" AS pk, SUM(fees) AS fees FROM rounds_fees GROUP BY "publicKey") f LEFT JOIN mem_accounts a ON f.pk = a."publicKey")
  UNION ALL
(SELECT a.address, f.rewards AS amount FROM
(SELECT "generatorPublicKey" AS pk, SUM(reward) AS rewards FROM blocks WHERE height <= (SELECT * FROM last_round) GROUP BY "generatorPublicKey") f LEFT JOIN mem_accounts a ON f.pk = a."publicKey")
),
accounts AS (SELECT address, SUM(amount) AS balance FROM balances GROUP BY address)
UPDATE mem_accounts m SET balance = a.balance FROM accounts a WHERE m.address = a.address AND m.balance <> a.balance;

-- Recalculate rewards
WITH new AS (SELECT "generatorPublicKey" AS pk, SUM(reward) AS rewards FROM blocks WHERE height <= (SELECT height FROM blocks WHERE height % 101 = 0 ORDER BY height DESC LIMIT 1) GROUP BY "generatorPublicKey")
UPDATE mem_accounts m SET rewards = new.rewards FROM new WHERE m."publicKey" = new.pk AND m.rewards <> new.rewards;

-- Recalculate forged blocks count
WITH new AS (SELECT "generatorPublicKey" AS pk, COUNT(1) AS cnt FROM blocks GROUP BY "generatorPublicKey")
UPDATE mem_accounts m SET producedblocks = new.cnt FROM new WHERE m."publicKey" = new.pk AND m.producedblocks <> new.cnt;

-- Recacluclate fees
WITH new AS (SELECT "publicKey" AS pk, SUM(fees) AS fees FROM rounds_fees GROUP BY "publicKey")
UPDATE mem_accounts m SET fees = new.fees FROM new WHERE m."publicKey" = new.pk AND m.fees <> new.fees;

-- Drop table votes_details
DROP TABLE IF EXISTS "votes_details";

-- Create table votes_details
CREATE TABLE IF NOT EXISTS "votes_details"(
  "tx_id" VARCHAR(20) REFERENCES trs(id) ON DELETE CASCADE,
  "voter" VARCHAR(22) NOT NULL,
  "type" VARCHAR(3) NOT NULL,
  "timestamp" INT NOT NULL,
  "round" INT NOT NULL,
  "delegate_pk" BYTEA
);

-- Populate table votes_details
INSERT INTO votes_details
SELECT r.tx_id, r.voter, (CASE WHEN substring(vote, 1, 1) = '+' THEN 'add' ELSE 'rem' END) AS type, r.timestamp, r.round, DECODE(substring(vote, 2), 'hex') AS delegate_pk FROM (
SELECT v."transactionId" AS tx_id, t."senderId" AS voter, b.timestamp AS timestamp, CEIL(b.height / 101::float)::int AS round, regexp_split_to_table(v.votes, ',') AS vote FROM votes v, trs t, blocks b WHERE v."transactionId" = t.id AND b.id = t."blockId"
) AS r ORDER BY r.timestamp ASC;

-- Create indexes on votes_details
CREATE INDEX votes_details_voter ON votes_details(voter);
CREATE INDEX votes_details_type ON votes_details(type);
CREATE INDEX votes_details_round ON votes_details(round);
CREATE INDEX votes_details_sort ON votes_details(voter ASC, timestamp DESC);
CREATE INDEX votes_details_dpk ON votes_details(delegate_pk);

-- Recalculate votes
WITH last_round AS (SELECT height, timestamp FROM blocks WHERE height % 101 = 0 ORDER BY height DESC LIMIT 1),
last_round_txs AS (SELECT t.id FROM trs t LEFT JOIN blocks b ON b.id = t."blockId" WHERE b.height > (SELECT height FROM last_round)),
voters AS (SELECT DISTINCT ON (voter) voter FROM votes_details),
balances AS (
  (SELECT UPPER("senderId") AS address, -SUM(amount+fee) AS amount FROM trs GROUP BY UPPER("senderId"))
    UNION ALL
  (SELECT UPPER("senderId") AS address, SUM(amount+fee) AS amount FROM trs WHERE id IN (SELECT * FROM last_round_txs) GROUP BY UPPER("senderId"))
    UNION ALL
  (SELECT UPPER("recipientId") AS address, SUM(amount) AS amount FROM trs WHERE "recipientId" IS NOT NULL GROUP BY UPPER("recipientId"))
    UNION ALL
  (SELECT UPPER("recipientId") AS address, -SUM(amount) AS amount FROM trs WHERE id IN (SELECT * FROM last_round_txs) AND "recipientId" IS NOT NULL GROUP BY UPPER("recipientId"))
    UNION ALL
  (SELECT address, fees+rewards AS amount FROM mem_accounts)
),
accounts AS (SELECT b.address, SUM(b.amount) AS balance FROM voters v
LEFT JOIN balances b ON b.address = v.voter
  GROUP BY b.address)
UPDATE mem_accounts SET vote = mm.balance FROM
(SELECT m."publicKey", (
  (SELECT COALESCE(SUM(balance), 0) AS balance FROM accounts WHERE address IN 
    (SELECT v.voter FROM
      (SELECT DISTINCT ON (voter) voter AS voter, delegate_pk, type FROM
        votes_details
        WHERE delegate_pk = m."publicKey" AND timestamp <= (SELECT timestamp FROM last_round)
        ORDER BY voter, timestamp DESC
      ) v
      WHERE v.type = 'add'
    )
  )
) FROM mem_accounts m) mm WHERE mem_accounts."publicKey" = mm."publicKey" AND mem_accounts.vote <> mm.balance;

-- Drop table votes_details
DROP TABLE IF EXISTS votes_details;
COMMIT;
