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
  DESCRIPTION: Dynamic-field query for column "rank"

  PARAMETERS: None
*/

(
SELECT m.row_number FROM (SELECT row_number()
  OVER (ORDER BY r.vote DESC, r."publicKey" ASC), address
    FROM (SELECT d."isDelegate", d.vote, d."publicKey", d.address
      FROM mem_accounts AS d
      WHERE d."isDelegate" = 1) AS r) m
    WHERE m.address = mem_accounts.address
)::bigint
