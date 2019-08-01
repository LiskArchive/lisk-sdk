/*
 * Copyright © 2019 Lisk Foundation
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

SELECT count(*)
FROM trs
	LEFT JOIN blocks AS b ON trs."blockId" = b.id
	LEFT JOIN mem_accounts AS m ON trs."recipientId" = m.address

${parsedFilters:raw}
