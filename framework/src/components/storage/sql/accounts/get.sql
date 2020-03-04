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

SELECT
	"address",
	ENCODE("publicKey", 'hex') as "publicKey",
	"username",
	"isDelegate"::int::boolean,
	"nonce",
	"balance",
	"asset",
	"nameexist"::int::boolean as "nameExist",
	"missedBlocks",
	"producedBlocks",
	"fees",
	"rewards",
	"voteWeight",
	case
	when
		"producedBlocks" + "missedBlocks" = 0 then 0
	else
		ROUND((("producedBlocks"::float / ("producedBlocks" + "missedBlocks")) * 100.0)::numeric, 2)::float
	end AS productivity,
	"votedDelegatesPublicKeys",
	"keys"
FROM
	mem_accounts

${parsedFilters:raw}

${parsedSort:raw}

LIMIT ${limit}
OFFSET ${offset}
