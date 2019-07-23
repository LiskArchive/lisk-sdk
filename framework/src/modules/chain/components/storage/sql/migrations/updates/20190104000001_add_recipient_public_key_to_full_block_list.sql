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
  DESCRIPTION: Add support of recipientPublicKey to the view

  PARAMETERS: None

  Due to issue https://dba.stackexchange.com/a/589/67449 used to drop view first and then create
*/

DROP VIEW "full_blocks_list";

CREATE VIEW "full_blocks_list" AS SELECT
    b.id AS b_id,
    b.version AS b_version,
    b."timestamp" AS b_timestamp,
    b.height AS b_height,
    b."previousBlock" AS "b_previousBlock",
    b."numberOfTransactions" AS "b_numberOfTransactions",
    b."totalAmount" AS "b_totalAmount",
    b."totalFee" AS "b_totalFee",
    b.reward AS b_reward,
    b."payloadLength" AS "b_payloadLength",
    encode(b."payloadHash", 'hex') AS "b_payloadHash",
    encode(b."generatorPublicKey", 'hex') AS "b_generatorPublicKey",
    encode(b."blockSignature", 'hex') AS "b_blockSignature",
    t.id AS t_id,
    t."rowId" AS "t_rowId",
    t.type AS t_type,
    t."timestamp" AS t_timestamp,
    encode(a."publicKey", 'hex') AS "t_recipientPublicKey",
    encode(t."senderPublicKey", 'hex') AS "t_senderPublicKey",
    t."senderId" AS "t_senderId",
    t."recipientId" AS "t_recipientId",
    t.amount AS t_amount,
    t.fee AS t_fee,
    encode(t.signature, 'hex') AS t_signature,
    encode(t."signSignature", 'hex') AS "t_signSignature",
    encode(s."publicKey", 'hex') AS "s_publicKey",
    d.username AS d_username,
    v.votes AS v_votes,
    m.min AS m_min,
    m.lifetime AS m_lifetime,
    m.keysgroup AS m_keysgroup,
    dapp.name AS dapp_name,
    dapp.description AS dapp_description,
    dapp.tags AS dapp_tags,
    dapp.type AS dapp_type,
    dapp.link AS dapp_link,
    dapp.category AS dapp_category,
    dapp.icon AS dapp_icon,
    it."dappId" AS "in_dappId",
    ot."dappId" AS "ot_dappId",
    ot."outTransactionId" AS "ot_outTransactionId",
    encode(t."requesterPublicKey", 'hex') AS "t_requesterPublicKey",
    tf.data AS tf_data,
    t.signatures AS t_signatures
   FROM (((((((((blocks b
     LEFT JOIN trs t ON (((t."blockId") = (b.id))))
     LEFT JOIN mem_accounts a ON (((t."recipientId") = (a.address)))
     LEFT JOIN delegates d ON (((d."transactionId") = (t.id))))
     LEFT JOIN votes v ON (((v."transactionId") = (t.id))))
     LEFT JOIN signatures s ON (((s."transactionId") = (t.id))))
     LEFT JOIN multisignatures m ON (((m."transactionId") = (t.id))))
     LEFT JOIN dapps dapp ON (((dapp."transactionId") = (t.id))))
     LEFT JOIN intransfer it ON (((it."transactionId") = (t.id))))
     LEFT JOIN outtransfer ot ON (((ot."transactionId") = (t.id))))
     LEFT JOIN transfer tf ON (((tf."transactionId") = (t.id))));
