SELECT
    "transactionId" AS transaction_id,
    encode("publicKey", 'hex') AS "s_publicKey"
FROM signatures
WHERE "transactionId" IN ($1:csv)
