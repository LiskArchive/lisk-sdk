BEGIN;

DO language plpgsql $$
BEGIN
	RAISE NOTICE 'Recreating views, please wait...';
END
$$;

  -- Recreate views
  CREATE VIEW "public".accounts_list AS
  SELECT DISTINCT a.address,
                  a.balance     AS balance,
                  a.public_key  AS "publicKey",
                  ss.second_public_key AS "secondPublicKey",
                  d.name        AS username,
                  d.rank,
                  d.fees,
                  d.rewards,
                  d.voters_balance      AS votes,
                  d.voters_count        AS voters,
                  d.blocks_forged_count AS "producedBlocks",
                  d.blocks_missed_count AS "missedBlocks",
                  mma.lifetime          AS multilifetime,
                  mma.minimum           AS multimin
  FROM            ((((accounts a
  left join       delegates d
  ON              (((
                                                                  d.public_key)::text = (a.public_key)::text)))
  left join       multisignatures_master mma
  ON              (((
                                                                  mma."public_key")::text = (a.public_key)::text)))
  left join       second_signature ss
  ON              (((
                                                                  ss."public_key")::text = (a.public_key)::text)))
  left join       multisignatures_member mme
  ON              (((
                                                                  mme."public_key")::text = (a.public_key)::text)));

  CREATE VIEW "public".blocks_list                     AS
  SELECT b.block_id                                    AS b_id,
         b.version                                     AS b_version,
         b."timestamp"                                 AS b_timestamp,
         b.height                                      AS b_height,
         b."previous_block_id"                         AS "b_previousBlock",
         b."total_transactions"                        AS "b_numberOfTransactions",
         b."total_amount"                              AS "b_totalAmount",
         b."total_fee"                                 AS "b_totalFee",
         b.reward                                      AS b_reward,
         b."payload_length"                            AS "b_payloadLength",
         encode(b."payload_hash", 'hex'::text)         AS "b_payloadHash",
         encode(b."generator_public_key", 'hex'::text) AS "b_generatorPublicKey",
         encode(b."signature", 'hex'::text)            AS "b_blockSignature",
         (
         (
                SELECT (max(blocks.height) + 1)
                FROM   blocks) - b.height) AS b_confirmations
  FROM   blocks b;

  ;
  CREATE VIEW "public".transactions_list            AS
  SELECT    t.transaction_id                        AS t_id,
            b.height                                AS b_height,
            t.block_id                              AS "t_blockId",
            t.TYPE                                  AS t_type,
            t."timestamp"                           AS t_timestamp,
            t.sender_public_key                     AS "t_senderPublicKey",
            a.public_key                            AS "a_recipientPublicKey",
            upper((t.sender_address)::text)         AS "t_senderId",
            upper((t.recipient_address)::text)      AS "t_recipientId",
            t.amount                                AS t_amount,
            t.fee                                   AS t_fee,
            encode(t.signature, 'hex'::text)        AS t_signature,
            encode(t.second_signature, 'hex'::text) AS "t_signSignature",
            t."signatures" AS "t_signatures",
            (
            (
                     SELECT   (blocks.height + 1)
                     FROM     blocks
                     ORDER BY blocks.height DESC limit 1) - b.height) AS confirmations
  FROM      ((transactions t
  left join blocks b
  ON        (((
                                          t.block_id)::text = (b.block_id)::text)))
  left join accounts a
  ON        (((
                                          t.recipient_address)::text = (a.address)::text)));

  ;
  CREATE VIEW "public".full_blocks_list                   AS
  SELECT    b.block_id                                    AS b_id,
            b.version                                     AS b_version,
            b."timestamp"                                 AS b_timestamp,
            b.height                                      AS b_height,
            b."previous_block_id"                         AS "b_previousBlock",
            b."total_transactions"                        AS "b_numberOfTransactions",
            b."total_amount"                              AS "b_totalAmount",
            b."total_fee"                                 AS "b_totalFee",
            b.reward                                      AS b_reward,
            b."payload_length"                            AS "b_payloadLength",
            encode(b."payload_hash", 'hex'::text)         AS "b_payloadHash",
            encode(b."generator_public_key", 'hex'::text) AS "b_generatorPublicKey",
            encode(b."signature", 'hex'::text)            AS "b_blockSignature",
            t.transaction_id                              AS t_id,
            t."row_id"                                    AS "t_rowId",
            t.TYPE                                        AS t_type,
            t."timestamp"                                 AS t_timestamp,
            encode(t."sender_public_key", 'hex'::text)    AS "t_senderPublicKey",
            t."sender_address"                            AS "t_senderId",
            t."recipient_address"                         AS "t_recipientId",
            t.amount                                      AS t_amount,
            t.fee                                         AS t_fee,
            encode(t.signature, 'hex'::text)              AS t_signature,
            encode(t."second_signature", 'hex'::text)     AS "t_signSignature",
            encode(s."public_key", 'hex'::text)           AS "s_publicKey",
            d.name                                        AS d_username,
            v.votes                                       AS v_votes,
            m.minimum                                     AS m_min,
            m.lifetime                                    AS m_lifetime,
            --m.keysgroup AS m_keysgroup, Need to implement this Stuff with a select
            dapp.name               AS dapp_name,
            dapp.description        AS dapp_description,
            dapp.tags               AS dapp_tags,
            dapp.TYPE               AS dapp_type,
            dapp.LINK               AS dapp_link,
            dapp.category           AS dapp_category,
            dapp.icon               AS dapp_icon,
            it."dapp_id"            AS "in_dappId",
            ot."dapp_id"            AS "ot_dappId",
            ot."out_transaction_id" AS "ot_outTransactionId",
            --encode(t."requester_public_key", 'hex'::text) AS "t_requesterPublicKey", What do we do with Stuff? Was uninmplemented and not in new schema
            convert_from(tf.data, 'utf8'::name) AS tf_data,
            t.signatures                        AS t_signatures
  FROM      (((((((((blocks b
  left join transactions t
  ON        (((
                                          t."block_id")::text = (b.block_id)::text)))
  left join delegates d
  ON        (((
                                          d.transaction_id)::text = (t.transaction_id)::text)))
  left join votes v
  ON        (((
                                          v."transaction_id")::text = (t.transaction_id)::text)))
  left join second_signature s
  ON        (((
                                          s."transaction_id")::text = (t.transaction_id)::text)))
  left join multisignatures_master m
  ON        (((
                                          m."transaction_id")::text = (t.transaction_id)::text)))
  left join dapps dapp
  ON        (((
                                          dapp."transaction_id")::text = (t.transaction_id)::text)))
  left join intransfer it
  ON        (((
                                          it."transaction_id")::text = (t.transaction_id)::text)))
  left join outtransfer ot
  ON        (((
                                          ot."transaction_id")::text = (t.transaction_id)::text)))
  left join transfer tf
  ON        (((
                                          tf."transaction_id")::text = (t.transaction_id)::text)));
END;
