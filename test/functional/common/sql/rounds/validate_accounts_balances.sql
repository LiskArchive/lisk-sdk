WITH
-- Determine last round
last_round AS (SELECT height FROM blocks WHERE height % 101 = 0 ORDER BY height DESC LIMIT 1),
-- Collect changes of balances
balances AS (
    -- Sender accounts
	(SELECT UPPER("senderId") AS address, -SUM(amount+fee) AS amount FROM trs GROUP BY UPPER("senderId"))
		UNION ALL
	-- Recipient accounts
	(SELECT UPPER("recipientId") AS address, SUM(amount) AS amount FROM trs WHERE "recipientId" IS NOT NULL GROUP BY UPPER("recipientId"))
		UNION ALL
	(
		-- Apply fees
		SELECT a.address, f.fees AS amount
		FROM (SELECT "publicKey" AS pk, SUM(fees) AS fees FROM rounds_fees GROUP BY "publicKey") f
		LEFT JOIN mem_accounts a ON f.pk = a."publicKey"
	)
		UNION ALL
	(
	    -- Apply rewards
		SELECT a.address, f.rewards AS amount
		FROM (SELECT "generatorPublicKey" AS pk, SUM(reward) AS rewards FROM blocks WHERE height <= (SELECT * FROM last_round) GROUP BY "generatorPublicKey") f
		LEFT JOIN mem_accounts a ON f.pk = a."publicKey"
	)
),
-- Sum balances
accounts AS (SELECT address, SUM(amount) AS balance FROM balances GROUP BY address)
-- Check differences
SELECT a.address, m."publicKey", m.username, a.balance AS blockchain, m.balance AS memory, m.balance-a.balance AS diff
FROM accounts a
LEFT JOIN mem_accounts m ON a.address = m.address
WHERE a.balance <> m.balance;
