/*
 * Create function 'validateMemBalances' for validation memory balances against blockchain
 */

BEGIN;

-- Create function that validates memory balances against blockchain
CREATE FUNCTION validateMemBalances() RETURNS TABLE(address VARCHAR(22), pk TEXT, username VARCHAR(20), blockchain BIGINT, memory BIGINT, diff BIGINT) LANGUAGE PLPGSQL AS $$
BEGIN
	 RETURN QUERY
		WITH balances AS (
			(SELECT UPPER("senderId") AS address, -SUM(amount+fee) AS amount FROM trs GROUP BY UPPER("senderId"))
				UNION ALL
			(SELECT UPPER("recipientId") AS address, SUM(amount) AS amount FROM trs WHERE "recipientId" IS NOT NULL GROUP BY UPPER("recipientId"))
				UNION ALL
			(SELECT a.address, r.amount FROM
				(SELECT r.pk, SUM(r.fees) + SUM(r.reward) AS amount FROM rounds_rewards r GROUP BY r.pk) r LEFT JOIN mem_accounts a ON r.pk = a."publicKey"
			)
		),
		accounts AS (SELECT b.address, SUM(b.amount) AS balance FROM balances b GROUP BY b.address)
		SELECT m.address, ENCODE(m."publicKey", 'hex') AS pk, m.username, a.balance::BIGINT AS blockchain, m.balance::BIGINT AS memory, (m.balance-a.balance)::BIGINT AS diff
		FROM accounts a LEFT JOIN mem_accounts m ON a.address = m.address WHERE a.balance <> m.balance;
END $$;

COMMIT;
