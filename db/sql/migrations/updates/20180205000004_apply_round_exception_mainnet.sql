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


/*
  DESCRIPTION: Apply reward exceptions for round 27040 (only on mainnet).

  PARAMETERS: None
*/

DO $$
	DECLARE
		is_mainnet INT;
	BEGIN
		SELECT count(1) FROM blocks WHERE height = 1 AND encode("generatorPublicKey", 'hex') = 'd121d3abf5425fdc0f161d9ddb32f89b7750b4bdb0bff7d18b191d4b4bafa6d4' INTO is_mainnet;

		IF is_mainnet > 0 THEN
			RAISE NOTICE 'Apply reward exceptions for round 27040, please wait...';

			WITH
				-- Selecting all blocks of round, apply exception fees and rewards factor
				round AS (
					SELECT
						b.timestamp, b.height, b."generatorPublicKey" AS "publicKey", b."totalFee" * 2 AS fees,
						b.reward * 2 AS reward, 10000000 AS fees_bonus
					FROM blocks b
					WHERE ceil(b.height / 101::float)::int = 27040
				),
				-- Calculating total fees of round, apply exception fees bonus
				fees AS (SELECT sum(fees) + fees_bonus AS total, floor((sum(fees) + fees_bonus) / 101) AS single FROM round GROUP BY fees_bonus),
				-- Get last delegate and timestamp of round's last block
				last AS (SELECT "publicKey", timestamp FROM round ORDER BY height DESC LIMIT 1)
			UPDATE rounds_rewards r SET fees = fix.fees, reward = fix.reward
			FROM (
				SELECT
					-- Timestamp of last round's block
					last.timestamp,
					-- Calculating real fee reward for delegate:
					-- Rounded fee per delegate + remaining fees if block is last one of round
					(fees.single + (CASE WHEN last."publicKey" = round."publicKey" AND last.timestamp = round.timestamp THEN (fees.total - fees.single * 101) ELSE 0 END)) AS fees,
					-- Block reward
					round.reward,
					-- Round
					ceil(round.height / 101::float)::int as round,
					-- Delegate public key
					round."publicKey"
				FROM last, fees, round
					-- Sort fees by block height
				ORDER BY round.height ASC
			) AS fix
			WHERE r.round = fix.round AND r."publicKey" = fix."publicKey";
		END IF;
END $$;
