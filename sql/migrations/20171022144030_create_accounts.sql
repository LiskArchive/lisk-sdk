BEGIN;

DO language plpgsql $$
BEGIN
	RAISE NOTICE 'Accounts table migration, please wait...';
END
$$;

DROP TABLE IF EXISTS accounts CASCADE;

CREATE TABLE "public".accounts (address varchar(22) NOT NULL,
	transaction_id varchar(20),
  public_key bytea,
  public_key_transaction_id varchar(20),
  balance bigint DEFAULT 0 NOT NULL,
  CONSTRAINT pk_accounts PRIMARY KEY (address),
	CONSTRAINT idx_accounts_public_key UNIQUE (public_key),
	CONSTRAINT idx_accounts_transaction_id UNIQUE (transaction_id)
);


CREATE OR REPLACE FUNCTION public.public_key_rollback() RETURNS TRIGGER LANGUAGE PLPGSQL AS $function$
	BEGIN
		NEW.public_key = NULL;
		RETURN NEW;
	END $function$ ;

	CREATE TRIGGER public_key_rollback
	BEFORE UPDATE ON accounts
	FOR EACH ROW WHEN (OLD.public_key_transaction_id IS NOT NULL AND NEW.public_key_transaction_id IS NULL)
	EXECUTE PROCEDURE public_key_rollback();

DROP FUNCTION public.validatemembalances();

CREATE FUNCTION public.validate_accounts_balances() RETURNS TABLE(address VARCHAR(22), public_key TEXT, delegate VARCHAR(20), blockchain BIGINT, memory BIGINT, diff BIGINT) LANGUAGE PLPGSQL AS $$
BEGIN
     RETURN QUERY
        WITH balances AS (
            (SELECT UPPER(sender_address) AS address, -SUM(amount+fee) AS amount FROM transactions GROUP BY UPPER(sender_address))
                UNION ALL
            (SELECT UPPER(recipient_address) AS address, SUM(amount) AS amount FROM transactions WHERE recipient_address IS NOT NULL GROUP BY UPPER(recipient_address))
                UNION ALL
            (SELECT a.address, r.amount FROM
                (SELECT r.public_key, SUM(r.fees) + SUM(r.reward) AS amount FROM rounds_rewards r GROUP BY r.public_key) r LEFT JOIN accounts a ON r.public_key = a.public_key
            )
        ),
        accounts_b AS (SELECT b.address, SUM(b.amount) AS balance FROM balances b GROUP BY b.address)
        SELECT m.address, ENCODE(m.public_key, 'hex') AS public_key, d.name, a.balance::BIGINT AS blockchain, m.balance::BIGINT AS memory, (m.balance-a.balance)::BIGINT AS diff
        FROM accounts a
        LEFT JOIN accounts m ON a.address = m.address
        LEFT JOIN delegates d ON a.address = d.address
        WHERE a.balance <> m.balance;
END $$;

CREATE
        OR REPLACE FUNCTION public.revert_mem_account() RETURNS TRIGGER LANGUAGE PLPGSQL AS $function$ BEGIN IF NEW."address" <> OLD."address" THEN
    RAISE WARNING 'Reverting change of address from % to %', OLD."address", NEW."address"; NEW."address" = OLD."address";
    END IF; IF NEW."u_username" <> OLD."u_username"
        AND OLD."u_username" IS NOT NULL THEN
    RAISE WARNING 'Reverting change of u_username from % to %', OLD."u_username", NEW."u_username"; NEW."u_username" = OLD."u_username";
    END IF; IF NEW."username" <> OLD."username"
        AND OLD."username" IS NOT NULL THEN
    RAISE WARNING 'Reverting change of username from % to %', OLD."username", NEW."username"; NEW."username" = OLD."username";
    END IF; IF NEW."virgin" <> OLD."virgin"
        AND OLD."virgin" = 0 THEN
    RAISE WARNING 'Reverting change of virgin from % to %', OLD."virgin", NEW."virgin"; NEW."virgin" = OLD."virgin";
    END IF; IF NEW."publicKey" <> OLD."publicKey"
        AND OLD."virgin" = 0
        AND OLD."publicKey" IS NOT NULL THEN
    RAISE WARNING 'Reverting change of publicKey from % to %', ENCODE(OLD."publicKey", 'hex'), ENCODE(NEW."publicKey", 'hex'); NEW."publicKey" = OLD."publicKey";
    END IF; IF NEW."secondPublicKey" <> OLD."secondPublicKey"
        AND OLD."secondPublicKey" IS NOT NULL THEN
    RAISE WARNING 'Reverting change of secondPublicKey from % to %', ENCODE(OLD."secondPublicKey", 'hex'), ENCODE(NEW."secondPublicKey", 'hex'); NEW."secondPublicKey" = OLD."secondPublicKey";
    END IF; RETURN NEW;
    END $function$ ;

END;
