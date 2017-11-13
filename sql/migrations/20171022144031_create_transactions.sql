BEGIN;

DO language plpgsql $$
BEGIN
	RAISE NOTICE 'Transactions table migration, please wait...';
END
$$;

 /* Rename all columns for new schema */
ALTER TABLE trs RENAME TO transactions;
ALTER TABLE transactions RENAME id TO "transaction_id";
ALTER TABLE transactions RENAME "rowId" TO "row_id";
ALTER TABLE transactions RENAME "blockId" TO "block_id";
ALTER TABLE transactions RENAME "senderPublicKey" TO "sender_public_key";
ALTER TABLE transactions RENAME "senderId" TO "sender_address";
ALTER TABLE transactions RENAME "recipientId" TO "recipient_address";
ALTER TABLE transactions RENAME "signSignature" TO "second_signature";
ALTER TABLE transactions RENAME "requesterPublicKey" TO "requester_public_key";

/* Rename rowId sequence */
ALTER SEQUENCE "public"."trs_rowId_seq" RENAME TO "transactions_row_id_seq";


  -- Transactions indexes
  CREATE INDEX idx_transactions_transaction_id
  ON "public".transactions( transaction_id );

  CREATE INDEX idx_transactions_sender_address
  ON "public".transactions ( sender_address );

  CREATE INDEX idx_transactions_recipient_address
  ON "public".transactions ( recipient_address );

  CREATE INDEX idx_transactions_block_id
  ON "public".transactions ( block_id );

CREATE OR REPLACE FUNCTION public.on_transaction_delete()
  RETURNS trigger
  LANGUAGE plpgsql
AS $function$
DECLARE
	sender_address VARCHAR(22);
	recipient_address VARCHAR(22);
BEGIN
	IF OLD."sender_address" IS NOT NULL THEN UPDATE accounts SET balance = accounts.balance+(OLD.amount+OLD.fee) WHERE accounts.address = OLD."sender_address";
	END IF;
	IF OLD."recipient_address" IS NOT NULL THEN UPDATE accounts SET balance = accounts.balance-OLD.amount WHERE accounts.address = OLD."recipient_address";
	END IF;
	RETURN NULL;
END $function$;

-- Create trigger that will execute 'on_transaction_delete' function before deletion of transaction
DROP TRIGGER on_transaction_delete on transactions;

CREATE CONSTRAINT TRIGGER on_transaction_delete
	AFTER DELETE ON transactions
	DEFERRABLE INITIALLY DEFERRED
	FOR EACH ROW
	EXECUTE PROCEDURE on_transaction_delete();

	-- Create function for maintain 'accounts' table
	CREATE OR REPLACE FUNCTION on_transaction_insert() RETURNS TRIGGER LANGUAGE PLPGSQL AS $$
		DECLARE
			sender_address VARCHAR(22);
			sender_public_key BYTEA;
			recipient_address VARCHAR(22);
		BEGIN
			-- Get accounts that are part of the transaction
			SELECT address, public_key INTO sender_address, sender_public_key FROM accounts WHERE address = NEW."sender_address";
			SELECT address INTO recipient_address FROM accounts WHERE address = NEW."recipient_address";

			IF sender_address IS NULL THEN
				-- No sender address in accounts - create new account
				INSERT INTO accounts (transaction_id, public_key, public_key_transaction_id, address) VALUES (NEW.transaction_id, NEW."sender_public_key", NEW.transaction_id, NEW."sender_address");
			ELSIF sender_public_key IS NULL THEN
				-- Sender address exists, but no public_key - update public_key
				UPDATE accounts SET public_key = NEW."sender_public_key", public_key_transaction_id = NEW.transaction_id WHERE accounts.address = NEW."sender_address";
			ELSIF sender_public_key != NEW."sender_public_key" THEN
				RAISE check_violation USING MESSAGE = 'Transaction invalid - cannot change account public key';
			END IF;

			IF recipient_address IS NULL AND NEW."recipient_address" IS NOT NULL THEN
				-- No recipient address in accounts - create new account
				INSERT INTO accounts (transaction_id, address) VALUES (NEW.transaction_id, NEW."recipient_address");
			END IF;

			-- Update sender balance
			IF NEW."sender_address" IS NOT NULL THEN
				UPDATE accounts SET balance = accounts.balance-(NEW.amount+NEW.fee) WHERE accounts.address = NEW."sender_address";
			END IF;

			-- Update recipient balance
			IF NEW."recipient_address" IS NOT NULL THEN
				UPDATE accounts SET balance = accounts.balance+NEW.amount WHERE accounts.address = NEW."recipient_address";
			END IF;

		RETURN NULL;
	END $$;


-- Create trigger that will execute 'on_transaction_insert' function after insertion of transaction
DROP TRIGGER on_transaction_insert on transactions;

CREATE TRIGGER on_transaction_insert
	AFTER INSERT ON transactions
	FOR EACH ROW
	EXECUTE PROCEDURE on_transaction_insert();

END;
