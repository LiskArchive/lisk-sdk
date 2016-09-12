/* Protect Mem Accounts Columns
 *
 */

BEGIN;

DROP TRIGGER IF EXISTS protect_mem_accounts ON "mem_accounts";

DROP FUNCTION IF EXISTS revert_mem_account();

CREATE FUNCTION revert_mem_account() RETURNS TRIGGER LANGUAGE PLPGSQL AS $$
BEGIN

  -- As per columns marked as immutable within application layer (logic/account.js).

  -- Revert any change of address
  IF NEW."address" <> OLD."address" THEN
    RAISE WARNING 'Reverting change of address from % to %', OLD."address", NEW."address";
    NEW."address" = OLD."address";
  END IF;

  -- Revert any change of u_username
  IF NEW."u_username" <> OLD."u_username" AND OLD."u_username" IS NOT NULL THEN
    RAISE WARNING 'Reverting change of u_username from % to %', OLD."u_username", NEW."u_username";
    NEW."u_username" = OLD."u_username";
  END IF;

  -- Revert any change of username
  IF NEW."username" <> OLD."username" AND OLD."username" IS NOT NULL THEN
    RAISE WARNING 'Reverting change of username from % to %', OLD."username", NEW."username";
    NEW."username" = OLD."username";
  END IF;

  -- Revert any change of virginity
  -- If account is no longer a virgin
  IF NEW."virgin" <> OLD."virgin" AND OLD."virgin" = 0 THEN
    RAISE WARNING 'Reverting change of virgin from % to %', OLD."virgin", NEW."virgin";
    NEW."virgin" = OLD."virgin";
  END IF;

  -- Revert any change of publicKey
  -- If account is no longer a virgin
  -- And publicKey is already set
  IF NEW."publicKey" <> OLD."publicKey" AND OLD."virgin" = 0 AND OLD."publicKey" IS NOT NULL THEN
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

CREATE TRIGGER protect_mem_accounts
  BEFORE UPDATE ON "mem_accounts" FOR EACH ROW
  EXECUTE PROCEDURE revert_mem_account();

COMMIT;
