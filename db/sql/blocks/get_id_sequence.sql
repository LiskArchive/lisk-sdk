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
  DESCRIPTION: ?

  PARAMETERS: ?
*/

WITH current_round AS
  (
    SELECT ceil(b.height / ${delegates}::float)::bigint
    FROM blocks b
    WHERE b.height <= ${height}
    ORDER BY b.height DESC
    LIMIT 1
  ),
     rounds AS
  (SELECT *
   FROM generate_series(
                         (SELECT *
                          FROM current_round),
                          (SELECT *
                           FROM current_round) - ${limit} + 1, -1))
SELECT b.id,
       b.height,
       ceil(b.height / ${delegates}::float)::bigint AS round
FROM blocks b
WHERE b.height IN
    (SELECT ((n - 1) * ${delegates}) + 1
     FROM rounds AS s(n))
ORDER BY height DESC
