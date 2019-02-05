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
	t."id" AS "id",
	b."height" AS "height",
	t."blockId" AS "blockId",
	t."type" AS "type",
	t."timestamp" AS "timestamp",
	t."senderPublicKey" AS "senderPublicKey",
	m."publicKey" AS "recipientPublicKey",
	upper(t."senderId"::text) AS "senderId",
	upper(t."recipientId"::text) AS "recipientId",
	encode(t."requesterPublicKey", 'hex'::text) AS "requesterPublicKey",
	t."amount" AS "amount",
	t."fee" AS "fee",
	encode(t."signature", 'hex'::text) AS "signature",
	encode(t."signSignature", 'hex'::text) AS "signSignature",
	t.signatures AS "signatures",
	t."asset" AS "asset",
	(( SELECT blocks.height + 1
		FROM blocks
		ORDER BY blocks.height DESC
		LIMIT 1)) - b.height AS "confirmations",
	t."rowId" AS "rowId"

FROM trs t
	LEFT JOIN blocks b ON t."blockId"::text = b.id::text
	LEFT JOIN mem_accounts m ON t."recipientId"::text = m.address::text

WHERE t."rowId" IS NOT NULL ${parsedFilters:raw}

${parsedSort:raw}

LIMIT ${limit} OFFSET ${offset}

-- regexp_split_to_array("t_signatures", ',') as "signatures",
