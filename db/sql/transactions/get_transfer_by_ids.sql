SELECT
    "transactionId" AS transaction_id,
    convert_from(data, 'utf8') AS tf_data
FROM transfer
WHERE "transactionId" IN ($1:csv)
