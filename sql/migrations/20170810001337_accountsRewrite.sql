BEGIN;

-- Consistency checks - 'mem_accounts' against blockchain
DO $$
DECLARE
	diff int;
BEGIN
	RAISE NOTICE 'Accounts rewrite migration, please wait...';

	SELECT COUNT(1) FROM validateMemBalances() INTO diff;

	IF diff > 0 THEN
		RAISE check_violation USING MESSAGE = 'Migration failed, mem_accounts are inconsistent';
	END IF;
END $$;

-- Create 'accounts' table
CREATE TABLE IF NOT EXISTS accounts (
	tx_id VARCHAR(20) REFERENCES trs(id) ON DELETE CASCADE,
	pk BYTEA DEFAULT NULL,
	pk_tx_id VARCHAR(20) DEFAULT NULL REFERENCES trs(id) ON DELETE SET NULL,
	second_pk BYTEA DEFAULT NULL,
	address VARCHAR(22) NOT NULL UNIQUE PRIMARY KEY,
	balance BIGINT NOT NULL DEFAULT 0
);

-- Create function for maintaining 'accounts' table
CREATE OR REPLACE FUNCTION on_transaction_insert() RETURNS TRIGGER LANGUAGE PLPGSQL AS $$
	DECLARE
		sender_address VARCHAR(22);
		sender_pk BYTEA;
		recipient_address VARCHAR(22);
	BEGIN
		-- Get sender belonging to transaction
		SELECT
			address,
			pk
		INTO
			sender_address,
			sender_pk
		FROM accounts
		WHERE address = NEW."senderId";

		-- Get recipient belonging to transaction
		SELECT
			address
		INTO
			recipient_address
		FROM accounts
		WHERE address = NEW."recipientId";

		IF sender_address IS NULL THEN
			-- No sender address in accounts - create new account
			INSERT INTO accounts (
				tx_id,
				pk,
				pk_tx_id,
				address
			) VALUES (
				NEW.id,
				NEW."senderPublicKey",
				NEW.id, NEW."senderId"
			);
		ELSIF sender_pk IS NULL THEN
			-- Sender address exists, but no public key - update public key
			UPDATE accounts SET
				pk = NEW."senderPublicKey",
				pk_tx_id = NEW.id
			WHERE accounts.address = NEW."senderId";
		ELSIF sender_pk != NEW."senderPublicKey" THEN
			RAISE check_violation USING MESSAGE = 'Transaction invalid - cannot change account public key';
		END IF;

		IF recipient_address IS NULL AND NEW."recipientId" IS NOT NULL THEN
			-- No recipient address in accounts - create new account
			INSERT INTO accounts (
				tx_id,
				address
			) VALUES (
				NEW.id,
				NEW."recipientId"
			);
		END IF;

		-- Update sender balance
		IF NEW."senderId" IS NOT NULL THEN
			UPDATE accounts SET
				balance = accounts.balance - (NEW.amount + NEW.fee)
			WHERE accounts.address = NEW."senderId";
		END IF;

		-- Update recipient balance
		IF NEW."recipientId" IS NOT NULL THEN
			UPDATE accounts SET
				balance = accounts.balance + NEW.amount
			WHERE accounts.address = NEW."recipientId";
		END IF;
	RETURN NULL;
END $$;

-- Create trigger that will execute 'on_transaction_insert' function after insertion of transaction
CREATE TRIGGER on_transaction_insert
	AFTER INSERT ON trs
	FOR EACH ROW
	EXECUTE PROCEDURE on_transaction_insert();

-- Create function for rollback of public key
CREATE OR REPLACE FUNCTION pk_rollback() RETURNS TRIGGER LANGUAGE PLPGSQL AS $$
	BEGIN
		NEW.pk = NULL;
	RETURN NEW;
END $$;

-- Create trigger that will execute 'pk_rollback' when 'pk_tx_id' is set to NULL
CREATE TRIGGER pk_rollback
	BEFORE UPDATE ON accounts
	FOR EACH ROW
	WHEN (OLD.pk_tx_id IS NOT NULL AND NEW.pk_tx_id IS NULL)
	EXECUTE PROCEDURE pk_rollback();

-- Create function for maintaining 'accounts' table in case of rollback
CREATE OR REPLACE FUNCTION on_transaction_delete() RETURNS TRIGGER LANGUAGE PLPGSQL AS $$
	DECLARE
		sender_address VARCHAR(22);
		recipient_address VARCHAR(22);
	BEGIN
		-- Update sender balance
		IF OLD."senderId" IS NOT NULL THEN
			UPDATE accounts SET
				balance = accounts.balance + (OLD.amount + OLD.fee)
			WHERE accounts.address = OLD."senderId";
		END IF;

		-- Update recipient balance
		IF OLD."recipientId" IS NOT NULL THEN
			UPDATE accounts SET
				balance = accounts.balance - OLD.amount
			WHERE accounts.address = OLD."recipientId";
		END IF;
	RETURN NULL;
END $$;

-- Create trigger that will execute 'on_transaction_delete' function before deletion of transaction
CREATE CONSTRAINT TRIGGER on_transaction_delete
	AFTER DELETE ON trs
	DEFERRABLE INITIALLY DEFERRED
	FOR EACH ROW
	EXECUTE PROCEDURE on_transaction_delete();

COMMIT;
