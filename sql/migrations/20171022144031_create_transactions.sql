BEGIN;

 CREATE TABLE "public".transactions (
 	transaction_id       varchar(20)  NOT NULL,
 	row_id               serial  NOT NULL,
 	block_id             varchar(20)  NOT NULL,
 	"type"               smallint  NOT NULL,
 	"timestamp"          integer  NOT NULL,
 	sender_public_key    bytea  NOT NULL,
	requester_public_key bytea ,
 	sender_address       varchar(22)  NOT NULL,
 	recipient_address    varchar(22)  ,
 	amount               bigint  NOT NULL,
 	fee                  bigint  NOT NULL,
 	signature            bytea  NOT NULL,
 	second_signature     bytea  ,
 	signatures           text  ,
 	CONSTRAINT pk_transactions PRIMARY KEY ( transaction_id ),
 	CONSTRAINT pk_transactions_4 UNIQUE ( transaction_id, sender_address, sender_public_key, recipient_address )
  );


	 CREATE OR REPLACE FUNCTION public.on_transaction_delete()
	  RETURNS trigger
	  LANGUAGE plpgsql
	 AS $function$ DECLARE sender_address VARCHAR(22); recipient_address VARCHAR(22); BEGIN IF OLD."sender_address" IS NOT NULL THEN UPDATE accounts SET balance = accounts.balance+(OLD.amount+OLD.fee) WHERE accounts.address = OLD."sender_address"; END IF; IF OLD."recipient_address" IS NOT NULL THEN UPDATE accounts SET balance = accounts.balance-OLD.amount WHERE accounts.address = OLD."recipient_address"; END IF; RETURN NULL; END $function$
	 ;

	 -- Create trigger that will execute 'on_transaction_delete' function before deletion of transaction
	 CREATE CONSTRAINT TRIGGER on_transaction_delete
	 	AFTER DELETE ON transactions
	 	DEFERRABLE INITIALLY DEFERRED
	 	FOR EACH ROW
	 	EXECUTE PROCEDURE on_transaction_delete();


	 CREATE OR REPLACE FUNCTION public.on_transaction_insert()
	  RETURNS trigger
	  LANGUAGE plpgsql
	 AS $function$ DECLARE sender_address VARCHAR(22); sender_public_key BYTEA; recipient_address VARCHAR(22); BEGIN SELECT address, public_key INTO sender_address, sender_public_key FROM accounts WHERE address = NEW."sender_address"; SELECT address INTO recipient_address FROM accounts WHERE address = NEW."recipient_address"; IF sender_address IS NULL THEN INSERT INTO accounts (transaction_id, public_key, public_key_transaction_id, address) VALUES (NEW.transaction_id, NEW."sender_public_key", NEW.transaction_id, NEW."sender_address"); ELSIF sender_public_key IS NULL THEN UPDATE accounts SET public_key = NEW."sender_public_key", public_key_transaction_id = NEW.transaction_id WHERE accounts.address = NEW."sender_address"; ELSIF sender_public_key != NEW."sender_public_key" THEN RAISE check_violation USING MESSAGE = 'Transaction invalid - cannot change account public key'; END IF; IF recipient_address IS NULL AND NEW."recipient_address" IS NOT NULL THEN INSERT INTO accounts (transaction_id, address) VALUES (NEW.transaction_id, NEW."recipient_address"); END IF; IF NEW."sender_address" IS NOT NULL THEN UPDATE accounts SET balance = accounts.balance-(NEW.amount+NEW.fee) WHERE accounts.address = NEW."sender_address"; END IF; IF NEW."recipient_address" IS NOT NULL THEN UPDATE accounts SET balance = accounts.balance+NEW.amount WHERE accounts.address = NEW."recipient_address"; END IF; RETURN NULL; END $function$
	 ;

	 -- Create trigger that will execute 'on_transaction_insert' function after insertion of transaction
	 CREATE TRIGGER on_transaction_insert
	 	AFTER INSERT ON transactions
	 	FOR EACH ROW
	 	EXECUTE PROCEDURE on_transaction_insert();

COMMIT;

END;
