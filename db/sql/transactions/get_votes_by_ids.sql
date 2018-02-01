SELECT
    "transactionId" AS transaction_id,
    votes AS v_votes
FROM votes
WHERE "transactionId" IN ($1:csv)
