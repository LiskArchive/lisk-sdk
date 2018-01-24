WITH delegate AS
  (SELECT 1
   FROM mem_accounts m
   WHERE m."isDelegate" = 1
     AND m."publicKey" = DECODE($1, 'hex')
   LIMIT 1),
     rewards AS
  (SELECT COUNT(1) AS COUNT,
          SUM(reward) AS rewards
   FROM blocks
   WHERE "generatorPublicKey" = DECODE($1, 'hex')
     AND ($2 IS NULL
          OR TIMESTAMP >= $2)
     AND ($3 IS NULL
          OR TIMESTAMP <= $3) ),
     fees AS
  (SELECT SUM(fees) AS fees
   FROM rounds_fees
   WHERE "publicKey" = DECODE($1, 'hex')
     AND ($2 IS NULL
          OR TIMESTAMP >= $2)
     AND ($3 IS NULL
          OR TIMESTAMP <= $3) )
SELECT
  (SELECT *
   FROM delegate) AS delegate,

  (SELECT COUNT
   FROM rewards) AS COUNT,

  (SELECT fees
   FROM fees) AS fees,

  (SELECT rewards
   FROM rewards) AS rewards
