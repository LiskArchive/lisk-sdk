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
  DESCRIPTION: Migrates amount and recipientId to the asset field.
  NOTE: The reason to drop the indexes first is because else the query takes 3 times more, 
  by dropping and later recreating the indexes we improve the runtime of this migration.
  PARAMETERS: None
*/

-- Drop indexes to make update faster
DROP INDEX public.trs_amount_asc_row_id_asc;
DROP INDEX public.trs_amount_desc_row_id_asc;
DROP INDEX public.trs_asset;
DROP INDEX public.trs_block_id;
DROP INDEX public.trs_fee_asc_row_id_asc;
DROP INDEX public.trs_fee_desc_row_id_asc;
DROP INDEX public.trs_recipient_id;
DROP INDEX public."trs_rowId";
DROP INDEX public."trs_senderPublicKey";
DROP INDEX public.trs_sender_id;
DROP INDEX public.trs_timestamp_asc_row_id_asc;
DROP INDEX public.trs_timestamp_desc_row_id_asc;
DROP INDEX public.trs_type_asc_row_id_asc;
DROP INDEX public.trs_type_desc_row_id_asc;
DROP INDEX public.trs_upper_recipient_id;
DROP INDEX public.trs_upper_sender_id;

-- Tidy up the table before any changes
VACUUM trs;

-- Disable triggers
ALTER TABLE trs DISABLE TRIGGER ALL;

-- Update the table
UPDATE trs SET asset = jsonb_build_object('amount', trs.amount, 'recipientId', trs."recipientId")
WHERE type = 0;

-- Drop the migrated columns

ALTER TABLE trs DROP COLUMN IF EXISTS "amount", DROP COLUMN IF EXISTS "recipientId";

-- Tidy up the table after the changes
VACUUM(ANALYZE) trs;

-- Enable triggers
ALTER TABLE trs ENABLE TRIGGER ALL;



-- Re-create all indexes

CREATE INDEX trs_amount_asc_row_id_asc
    ON public.trs USING btree
    (amount ASC NULLS LAST, "rowId" ASC NULLS LAST)
    TABLESPACE pg_default;


CREATE INDEX trs_amount_desc_row_id_asc
    ON public.trs USING btree
    (amount DESC NULLS FIRST, "rowId" ASC NULLS LAST)
    TABLESPACE pg_default;



CREATE INDEX trs_asset
    ON public.trs USING gin
    (asset)
    TABLESPACE pg_default;
	


CREATE INDEX trs_block_id
    ON public.trs USING btree
    ("blockId" COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;
	

CREATE INDEX trs_fee_asc_row_id_asc
    ON public.trs USING btree
    (fee ASC NULLS LAST, "rowId" ASC NULLS LAST)
    TABLESPACE pg_default;



CREATE INDEX trs_fee_desc_row_id_asc
    ON public.trs USING btree
    (fee DESC NULLS FIRST, "rowId" ASC NULLS LAST)
    TABLESPACE pg_default;
	
	
CREATE INDEX trs_recipient_id
    ON public.trs USING btree
    ("recipientId" COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;
	


CREATE INDEX "trs_rowId"
    ON public.trs USING btree
    ("rowId" ASC NULLS LAST)
    TABLESPACE pg_default;


CREATE INDEX "trs_senderPublicKey"
    ON public.trs USING btree
    ("senderPublicKey" ASC NULLS LAST)
    TABLESPACE pg_default;



CREATE INDEX trs_sender_id
    ON public.trs USING btree
    ("senderId" COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;



CREATE INDEX trs_timestamp_asc_row_id_asc
    ON public.trs USING btree
    ("timestamp" ASC NULLS LAST, "rowId" ASC NULLS LAST)
    TABLESPACE pg_default;


CREATE INDEX trs_timestamp_desc_row_id_asc
    ON public.trs USING btree
    ("timestamp" DESC NULLS FIRST, "rowId" ASC NULLS LAST)
    TABLESPACE pg_default;


CREATE INDEX trs_type_asc_row_id_asc
    ON public.trs USING btree
    (type ASC NULLS LAST, "rowId" ASC NULLS LAST)
    TABLESPACE pg_default;



CREATE INDEX trs_type_desc_row_id_asc
    ON public.trs USING btree
    (type DESC NULLS FIRST, "rowId" ASC NULLS LAST)
    TABLESPACE pg_default;



CREATE INDEX trs_upper_recipient_id
    ON public.trs USING btree
    (upper("recipientId"::text) COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;



CREATE INDEX trs_upper_sender_id
    ON public.trs USING btree
    (upper("senderId"::text) COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;
