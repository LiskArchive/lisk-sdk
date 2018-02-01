SELECT
    "transactionId" AS transaction_id,
    min AS m_min,
    lifetime AS m_lifetime,
    keysgroup AS m_keysgroup
FROM multisignatures
WHERE "transactionId" IN ($1:csv)
