/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

WITH balances AS (
	-- Subtract amount and fee from sender accounts
	(SELECT UPPER("senderId") AS address, -SUM(amount+fee) AS amount FROM trs GROUP BY UPPER("senderId"))
		UNION ALL
	-- Credit amount to recipient accounts
	(SELECT UPPER("recipientId") AS address, SUM(amount) AS amount FROM trs WHERE "recipientId" IS NOT NULL GROUP BY UPPER("recipientId"))
		UNION ALL
	-- Sum total rewards (fee split + block reward) from all rounds, for all delegates accounts
	(SELECT a.address, r.amount FROM
		(SELECT r."publicKey", SUM(r.fees) + SUM(r.reward) AS amount FROM rounds_rewards r GROUP BY r."publicKey") r LEFT JOIN mem_accounts a ON r."publicKey" = a."publicKey"
	)
),
-- Sum all calculated accounts balances
accounts AS (SELECT b.address, SUM(b.amount) AS balance FROM balances b GROUP BY b.address)
-- Compare calculated (based on blockchain) balances with current accounts balances (mem_accounbts)
SELECT m.address, ENCODE(m."publicKey", 'hex') AS "publicKey", m.username, a.balance::BIGINT AS blockchain, m.balance::BIGINT AS memory, (m.balance-a.balance)::BIGINT AS diff
FROM accounts a LEFT JOIN mem_accounts m ON a.address = m.address WHERE a.balance <> m.balance;
