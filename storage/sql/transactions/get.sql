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
	"t_blockId" as "blockId",
	"b_height" as "blockHeight",
	"t_type" as "type",
	"t_timestamp" as "timestamp",
	"t_senderId" as "senderId",
	"t_recipientId" as "recipientId",
	"t_amount" as "amount",
	"t_fee" as "fee",
	"t_signature" as "signature",
	"t_SignSignature" as "signSignature",
	"t_signatures" as "signatures",
	"confirmations" as "confirmations",
	ENCODE("t_senderPublicKey", 'hex') as "senderPublicKey",
	ENCODE("m_recipientPublicKey", 'hex') as "requesterPublicKey"
FROM
	trs_list

${parsedFilters:raw}

LIMIT ${limit} OFFSET ${offset}

