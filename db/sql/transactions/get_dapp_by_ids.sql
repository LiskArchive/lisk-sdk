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
  DESCRIPTION: Gets dapp transactions from a list of id-s.

  PARAMETERS:
      - ids: array of transaction id-s
*/

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
WHERE "transactionId" IN (${ids:csv})
