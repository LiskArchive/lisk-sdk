/*
 * Add 'm_recipientPublicKey' column to 'trs_list' view
 * Change 't_senderPublicKey' data type from 'string' to 'bytea'
 */

BEGIN;

DROP VIEW IF EXISTS trs_list;

CREATE VIEW trs_list AS

SELECT t."id" AS "t_id",
       b."height" AS "b_height",
       t."blockId" AS "t_blockId",
       t."type" AS "t_type",
       t."timestamp" AS "t_timestamp",
       t."senderPublicKey" AS "t_senderPublicKey",
       m."publicKey" AS "m_recipientPublicKey",
       t."senderId" AS "t_senderId",
       t."recipientId" AS "t_recipientId",
       t."amount" AS "t_amount",
       t."fee" AS "t_fee",
       ENCODE(t."signature", 'hex') AS "t_signature",
       ENCODE(t."signSignature", 'hex') AS "t_SignSignature",
       t."signatures" AS "t_signatures",
       (SELECT MAX("height") + 1 FROM blocks) - b."height" AS "confirmations"

FROM trs t

INNER JOIN blocks b ON t."blockId" = b."id"
LEFT JOIN mem_accounts m ON t."recipientId" = m."address";

COMMIT;
