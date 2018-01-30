/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

WITH delegate AS
  (SELECT 1
   FROM mem_accounts m
   WHERE m."isDelegate" = 1
     AND m."publicKey" = decode($1, 'hex')
   LIMIT 1),
     rewards AS
  (SELECT count(1) AS count,
          sum(reward) AS rewards
   FROM blocks
   WHERE "generatorPublicKey" = decode($1, 'hex')
     AND ($2 IS NULL
          OR "timestamp" >= $2)
     AND ($3 IS NULL
          OR "timestamp" <= $3) ),
     fees AS
  (SELECT sum(fees) AS fees
   FROM rounds_fees
   WHERE "publicKey" = decode($1, 'hex')
     AND ($2 IS NULL
          OR "timestamp" >= $2)
     AND ($3 IS NULL
          OR "timestamp" <= $3) )
SELECT
  (SELECT *
   FROM delegate) AS delegate,

  (SELECT count
   FROM rewards) AS count,

  (SELECT fees
   FROM fees) AS fees,

  (SELECT rewards
   FROM rewards) AS rewards
