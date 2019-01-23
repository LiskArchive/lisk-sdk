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
  DESCRIPTION: Insert rewards for round to round rewards table.

  PARAMETERS: timestamp - Timestamp of last block of round
              fees - Fees amount for particular block
              reward - Rewards amount for particular block
              round - Round number
              publicKey - Public key of a delegate that forged a block
*/

INSERT INTO rounds_rewards (
	"timestamp",
	"fees",
	"reward",
	"round",
	"publicKey"
) VALUES (
	${timestamp},
	${fees}::bigint,
	${reward}::bigint,
	${round},
	DECODE(${publicKey}, 'hex')
)
