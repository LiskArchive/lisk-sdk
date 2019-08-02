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
  DESCRIPTION: Remove u_username from protections carried on by this trigger.
  PARAMETERS: None
*/

 CREATE OR REPLACE FUNCTION revert_mem_account() RETURNS TRIGGER LANGUAGE PLPGSQL AS $$

 BEGIN

   -- As per columns marked as immutable within application layer (logic/account.js).

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

   -- Revert any change of secondPublicKey
  -- If secondPublicKey is already set
  IF NEW."secondPublicKey" <> OLD."secondPublicKey" AND OLD."secondPublicKey" IS NOT NULL THEN
    RAISE WARNING 'Reverting change of secondPublicKey from % to %', ENCODE(OLD."secondPublicKey", 'hex'),  ENCODE(NEW."secondPublicKey", 'hex');
    NEW."secondPublicKey" = OLD."secondPublicKey";
  END IF;

   RETURN NEW;

 END $$;
 