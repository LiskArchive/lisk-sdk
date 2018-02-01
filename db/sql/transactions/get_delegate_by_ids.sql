SELECT "transactionId" AS transaction_id, username AS d_username
FROM delegates
WHERE "transactionId" IN ($1:csv)
