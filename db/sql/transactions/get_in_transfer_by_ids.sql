SELECT
    "transactionId" AS transaction_id,
    "dappId" AS in_dappId
FROM intransfer
WHERE "transactionId" IN ($1:csv)
