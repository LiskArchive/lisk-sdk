/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

WITH delegate AS
  (SELECT 1
   FROM ${schema~}.mem_accounts m
   WHERE m."isDelegate" = 1
     AND m."publicKey" = decode($1, 'hex')
   LIMIT 1),
     rewards AS
  (SELECT count(1) AS count,
          sum(reward) AS rewards
   FROM ${schema~}.blocks
   WHERE "generatorPublicKey" = decode($1, 'hex')
     AND ($2 IS NULL
          OR TIMESTAMP >= $2)
     AND ($3 IS NULL
          OR TIMESTAMP <= $3) ),
     fees AS
  (SELECT sum(fees) AS fees
   FROM ${schema~}.rounds_fees
   WHERE "publicKey" = DECODE($1, 'hex')
     AND ($2 IS NULL
          OR TIMESTAMP >= $2)
     AND ($3 IS NULL
          OR TIMESTAMP <= $3) )
SELECT
  (SELECT *
   FROM delegate) AS delegate,

  (SELECT count
   FROM ${schema~}.rewards) AS count,

  (SELECT fees
   FROM ${schema~}.fees) AS fees,

  (SELECT rewards
   FROM ${schema~}.rewards) AS rewards
