SELECT
    "transactionId" AS transaction_id,
    name AS dapp_name,
    description AS dapp_description,
    tags AS dapp_tags,
    link AS dapp_link,
    type AS dapp_type,
    category AS dapp_category,
    icon AS dapp_icon
FROM dapps
WHERE "transactionId" IN ($1:csv)
