SELECT
    "transactionId" AS transaction_id,
    "dappId" AS "ot_dappId",
    "outTransactionId" AS "ot_outTransactionId"
FROM outtransfer
WHERE "transactionId" IN ($1:csv)
