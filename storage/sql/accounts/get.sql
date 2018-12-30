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

SELECT
	"address",
	ENCODE("publicKey", 'hex') as "publicKey",
	ENCODE("secondPublicKey", 'hex') as "secondPublicKey",
	"username",
	"isDelegate",
	"secondSignature",
	"balance",
	"multimin" as "multiMin",
	"multilifetime" as "multiLifetime",
	"nameexist" as "nameExist",
	"fees",
	"rewards",
	"vote",
	"producedBlocks",
	"missedBlocks",
	"rank"
FROM
	mem_accounts

${parsedFilters:raw}

${parsedSort:raw}

LIMIT ${limit}
OFFSET ${offset}
