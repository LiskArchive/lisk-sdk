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


/*
DESCRIPTION: Recreate full_blocks_list, add join for transfer table.

PARAMETERS: None
*/

DROP VIEW IF EXISTS full_blocks_list;

CREATE VIEW full_blocks_list AS

SELECT  b."id" AS "b_id",
        b."version" AS "b_version",
        b."timestamp" AS "b_timestamp",
        b."height" AS "b_height",
        b."previousBlock" AS "b_previousBlock",
        b."numberOfTransactions" AS "b_numberOfTransactions",
        (b."totalAmount")::bigint AS "b_totalAmount",
        (b."totalFee")::bigint AS "b_totalFee",
        (b."reward")::bigint AS "b_reward",
        b."payloadLength" AS "b_payloadLength",
        ENCODE(b."payloadHash", 'hex') AS "b_payloadHash",
        ENCODE(b."generatorPublicKey", 'hex') AS "b_generatorPublicKey",
        ENCODE(b."blockSignature", 'hex') AS "b_blockSignature",
        t."id" AS "t_id",
        t."rowId" AS "t_rowId",
        t."type" AS "t_type",
        t."timestamp" AS "t_timestamp",
        ENCODE(t."senderPublicKey", 'hex') AS "t_senderPublicKey",
        t."senderId" AS "t_senderId",
        t."recipientId" AS "t_recipientId",
        (t."amount")::bigint AS "t_amount",
        (t."fee")::bigint AS "t_fee",
        ENCODE(t."signature", 'hex') AS "t_signature",
        ENCODE(t."signSignature", 'hex') AS "t_signSignature",
        ENCODE(s."publicKey", 'hex') AS "s_publicKey",
        d."username" AS "d_username",
        v."votes" AS "v_votes",
        m."min" AS "m_min",
        m."lifetime" AS "m_lifetime",
        m."keysgroup" AS "m_keysgroup",
        dapp."name" AS "dapp_name",
        dapp."description" AS "dapp_description",
        dapp."tags" AS "dapp_tags",
        dapp."type" AS "dapp_type",
        dapp."link" AS "dapp_link",
        dapp."category" AS "dapp_category",
        dapp."icon" AS "dapp_icon",
        it."dappId" AS "in_dappId",
        ot."dappId" AS "ot_dappId",
        ot."outTransactionId" AS "ot_outTransactionId",
        ENCODE(t."requesterPublicKey", 'hex') AS "t_requesterPublicKey",
        tf."data" AS "tf_data",
        t."signatures" AS "t_signatures"

FROM blocks b

LEFT OUTER JOIN trs AS t ON t."blockId" = b."id"
LEFT OUTER JOIN delegates AS d ON d."transactionId" = t."id"
LEFT OUTER JOIN votes AS v ON v."transactionId" = t."id"
LEFT OUTER JOIN signatures AS s ON s."transactionId" = t."id"
LEFT OUTER JOIN multisignatures AS m ON m."transactionId" = t."id"
LEFT OUTER JOIN dapps AS dapp ON dapp."transactionId" = t."id"
LEFT OUTER JOIN intransfer AS it ON it."transactionId" = t."id"
LEFT OUTER JOIN outtransfer AS ot ON ot."transactionId" = t."id"
LEFT OUTER JOIN transfer AS tf ON tf."transactionId" = t."id";
