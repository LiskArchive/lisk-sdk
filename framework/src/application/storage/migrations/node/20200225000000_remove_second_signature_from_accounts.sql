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
  DESCRIPTION: Remove secondSignature and secondPublicKey column from mem accounts
*/

CREATE OR REPLACE FUNCTION revert_mem_account() RETURNS TRIGGER LANGUAGE PLPGSQL AS $$

BEGIN

  -- Revert any change of address
  IF NEW."address" <> OLD."address" THEN
    RAISE WARNING 'Reverting change of address from % to %', OLD."address", NEW."address";
    NEW."address" = OLD."address";
  END IF;

  -- Revert any change of username except of setting to null (see pop last block procedures)
  IF NEW."username" <> OLD."username" AND NEW."username" IS NOT NULL AND OLD."username" IS NOT NULL THEN
    RAISE WARNING 'Reverting change of username from % to %', OLD."username", NEW."username";
    NEW."username" = OLD."username";
  END IF;

  -- Revert any change of publicKey
  -- And publicKey is already set
  IF NEW."publicKey" <> OLD."publicKey" AND OLD."publicKey" IS NOT NULL THEN
    RAISE WARNING 'Reverting change of publicKey from % to %', ENCODE(OLD."publicKey", 'hex'), ENCODE(NEW."publicKey", 'hex');
    NEW."publicKey" = OLD."publicKey";
  END IF;

  RETURN NEW;

END $$;

ALTER TABLE mem_accounts
DROP COLUMN "secondSignature",
DROP COLUMN "secondPublicKey";
