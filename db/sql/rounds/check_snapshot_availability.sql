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
  DESCRIPTION: Check round snapshot availability for a particular round
               Returns TRUE when snapshot available or table is empty, FALSE otherwise

  PARAMETERS: round - Round for we are checking availability
*/

SELECT (
	CASE WHEN (
		SELECT 1 AS available FROM mem_round_snapshot WHERE round = ${round} LIMIT 1
	) = 1 THEN TRUE
	ELSE (
		CASE WHEN (
			SELECT COUNT(*) FROM mem_round_snapshot
		) = 0 THEN TRUE
		ELSE FALSE
		END
	)
	END
) AS available
