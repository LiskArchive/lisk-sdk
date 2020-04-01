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
	"id",
	ENCODE("payloadHash", 'hex') as "payloadHash",
	ENCODE("generatorPublicKey", 'hex') as "generatorPublicKey",
	ENCODE("blockSignature", 'hex') as "blockSignature",
	ENCODE("seedReveal", 'hex') as "seedReveal",
	"height",
	"totalFee",
	"reward",
	"payloadLength",
	"maxHeightPreviouslyForged",
	"maxHeightPrevoted",
	"previousBlockId",
	"numberOfTransactions",
	"totalAmount",
	"timestamp",
	"version",
	( SELECT max(b.height) + 1 FROM blocks AS b ) - blocks.height AS "confirmations"
FROM
	blocks

${parsedFilters:raw}

${parsedSort:raw}

LIMIT ${limit}
OFFSET ${offset}
