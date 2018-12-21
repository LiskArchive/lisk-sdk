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
	"t_id" as "id",
	"b_id" as "blockId",
	"b_height" as "blockHeight",
	"t_type" as "type",
	"t_timestamp" as "timestamp",
	"t_senderId" as "senderId",
	"t_recipientId" as "recipientId",
	"t_amount" as "amount",
	"t_fee" as "fee",
	"t_signature" as "signature",
	"t_signSignature" as "signSignature",
	"t_signatures" as "signatures",
	"t_senderPublicKey" as "senderPublicKey",
	"t_requesterPublicKey" as "requesterPublicKey",
	(( SELECT (blocks.height + 1)
           FROM blocks
          ORDER BY blocks.height DESC
         LIMIT 1) - b.height) AS confirmations
FROM
	(full_blocks_list fbl
	LEFT JOIN blocks b ON (((fbl."b_id")::text = (b.id)::text)))

${parsedFilters:raw}

LIMIT ${limit} OFFSET ${offset}

