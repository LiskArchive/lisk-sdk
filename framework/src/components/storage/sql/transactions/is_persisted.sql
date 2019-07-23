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

SELECT EXISTS (
	SELECT 1 FROM trs
		LEFT JOIN blocks b ON trs."blockId"::text = b.id::text
		LEFT JOIN mem_accounts m ON trs."recipientId"::text = m.address::text
		${parsedFilters:raw}
);
