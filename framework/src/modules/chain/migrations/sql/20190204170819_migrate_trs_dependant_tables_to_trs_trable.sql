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
  DESCRIPTION: Migrate all trs dependant tables into trs asset field and drop dependsant tables

  PARAMETERS: None
*/

-- Add transfer data column to trs table as bytea
ALTER TABLE "trs" ADD COLUMN IF NOT EXISTS "transferData" BYTEA;


-- Add asset column to trs table as jsonb
ALTER TABLE "trs" ADD COLUMN IF NOT EXISTS "asset" jsonb;


-- Migrate transfer table into trs transferData field
UPDATE trs
SET "transferData" = (
        SELECT t."data"
        FROM transfer as t
        WHERE t."transactionId" = trs.id
    )
WHERE id IN (SELECT "transactionId" FROM transfer);


-- Migrate signatures table into trs asset field
UPDATE trs
SET asset = (
        SELECT concat('{"signature":{"publicKey":"',encode(s."publicKey",'hex'::text),'"}}')::json
        FROM signatures as s
        WHERE s."transactionId" = trs.id
    )
WHERE id IN (SELECT "transactionId" FROM signatures);


-- Migrate delegates table into trs asset field
UPDATE trs
SET asset = (
        SELECT concat('{"delegate":{"username":"',d."username",'"}}')::json
        FROM delegates as d
        WHERE d."transactionId" = trs.id
    )
WHERE id IN (SELECT "transactionId" FROM delegates);


-- Migrate votes table into trs asset field
UPDATE trs
SET asset = (
        SELECT concat('{"votes":',array_to_json(regexp_split_to_array(v."votes",',')),'}')::json
        FROM votes as v
        WHERE v."transactionId" = trs.id
    )
WHERE id IN (SELECT "transactionId" FROM votes);


-- Migrate multisignatures table into trs asset field
UPDATE trs
SET asset = (
        SELECT concat('{"multisignature":{"min":',ms.min,',"lifetime":',ms.lifetime,',"keysgroup":',array_to_json(regexp_split_to_array(ms."keysgroup",',')),'}}')::json
        FROM multisignatures as ms
        WHERE ms."transactionId" = trs.id
    )
WHERE id IN (SELECT "transactionId" FROM multisignatures);


-- Migrate dapps table into trs asset field
UPDATE trs
SET asset = (
        SELECT concat('{"dapp":{"type":',d."type",',"name":"',d."name",'","description":"',d."description",'","tags":"',d."tags",'","link":"',d."link",'","icon":"',d."icon",'","category":',d."category",'}}')::json
        FROM dapps as d
        WHERE d."transactionId" = trs.id
    )
WHERE id IN (SELECT "transactionId" FROM dapps);


-- Migrate intransfer table into trs asset field
UPDATE trs
SET asset = (
        SELECT concat('{"inTransfer":{"dappId":"',it."dappId",'"}}')::json
        FROM intransfer as it
        WHERE it."transactionId" = trs.id
    )
WHERE type = 6;


-- Migrate outtransfer table into trs asset field
UPDATE trs
SET asset = (
        SELECT concat('{"outTransfer":{"dappId":"',ot."dappId",'","transactionId":"',ot."outTransactionId",'"}}')::json
        FROM outtransfer as ot
        WHERE ot."transactionId" = trs.id
    )
WHERE type = 7;


-- Remove all trs dependant tables (transfer, signatures, delegates, votes, multisignatures, dapps, intransfer, outtransfer)
-- Note that it will also drop the `full_blocks_list` view as it uses some of these tables
DROP TABLE "transfer", "signatures", "delegates", "votes", "multisignatures", "dapps", "intransfer", "outtransfer" CASCADE;


-- Create index for asset field. Using `gin` index as it's more efficient for keys or key/value search.
CREATE INDEX IF NOT EXISTS "trs_asset" ON "trs" USING gin ("asset");
