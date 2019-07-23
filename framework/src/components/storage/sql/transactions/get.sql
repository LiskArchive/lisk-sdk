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
	trs."id" AS "id",
	b."height" AS "height",
	trs."blockId" AS "blockId",
	trs."type" AS "type",
	trs."timestamp" AS "timestamp",
	encode(trs."senderPublicKey", 'hex'::text) AS "senderPublicKey",
	encode(m."publicKey", 'hex'::text) AS "recipientPublicKey",
	upper(trs."senderId"::text) AS "senderId",
	upper(trs."recipientId"::text) AS "recipientId",
	encode(trs."requesterPublicKey", 'hex'::text) AS "requesterPublicKey",
	trs."amount" AS "amount",
	trs."fee" AS "fee",
	encode(trs."signature", 'hex'::text) AS "signature",
	encode(trs."signSignature", 'hex'::text) AS "signSignature",
	regexp_split_to_array(trs."signatures", ',') as "signatures",
	(( SELECT blocks.height + 1
		FROM blocks
		ORDER BY blocks.height DESC
		LIMIT 1)) - b.height AS "confirmations"

FROM trs
	LEFT JOIN blocks b ON trs."blockId" = b.id
	LEFT JOIN mem_accounts m ON trs."recipientId" = m.address

${parsedFilters:raw}

${parsedSort:raw}

LIMIT ${limit} OFFSET ${offset}
