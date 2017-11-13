BEGIN;

DO language plpgsql $$
BEGIN
	RAISE NOTICE 'Delegates migration, please wait...';
END
$$;


/* Delegates Stuff */
ALTER TABLE delegates RENAME tx_id TO "transaction_id";
ALTER TABLE delegates RENAME pk TO "public_key";
ALTER TABLE delegates RENAME voters_cnt TO "voters_count";
ALTER TABLE delegates RENAME blocks_missed_cnt TO "blocks_missed_count";
ALTER TABLE delegates RENAME blocks_forged_cnt TO "blocks_forged_count";

DROP FUNCTION getdelegateslist();
DROP TRIGGER block_insert_delete ON blocks;
DROP FUNCTION delegates_forged_blocks_cnt_update();
DROP FUNCTION delegates_voters_cnt_update();


CREATE OR REPLACE FUNCTION public.delegate_change_ranks_update()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN PERFORM delegates_rank_update();
RETURN NULL;
END $function$;

CREATE OR REPLACE FUNCTION public.delegates_forged_blocks_count_update()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
IF(TG_OP = 'INSERT') THEN UPDATE delegates SET blocks_forged_count = blocks_forged_count + 1 WHERE public_key = NEW."generator_public_key";
ELSIF(TG_OP = 'DELETE') THEN UPDATE delegates SET blocks_forged_count = blocks_forged_count - 1 WHERE public_key = OLD."generator_public_key";
END IF;
RETURN NULL;
END $function$;

--Create trigger that will execute 'delegates_forged_blocks_cnt_update' after insertion or deletion of block
CREATE CONSTRAINT TRIGGER block_insert_delete
AFTER INSERT OR DELETE ON blocks
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE PROCEDURE delegates_forged_blocks_count_update();

CREATE OR REPLACE FUNCTION public.delegates_rank_update() RETURNS TABLE(updated integer) LANGUAGE PLPGSQL AS $function$
BEGIN
RETURN QUERY WITH new AS(
  SELECT row_number() OVER(ORDER BY voters_balance DESC, public_key ASC) AS rank, transaction_id FROM delegates),
	updated AS (UPDATE delegates SET rank = new.rank FROM new WHERE delegates.transaction_id = new.transaction_id RETURNING 1)
	SELECT COUNT(1)::INT FROM updated;
END $function$;

CREATE OR REPLACE FUNCTION public.delegates_update_on_block()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
 IF(TG_OP = 'INSERT') AND(NEW.height != 1) THEN PERFORM outsiders_update();
END IF;
PERFORM delegates_voters_count_update();
PERFORM delegates_voters_balance_update();
PERFORM delegates_rank_update();
IF(TG_OP = 'DELETE') THEN PERFORM outsiders_rollback(ENCODE(OLD.
  "generator_public_key", 'hex'));
END IF;
IF(TG_OP = 'INSERT') THEN PERFORM pg_notify('round-closed', json_build_object('round', CEIL((NEW.height + 1) / 101::float)::int, 'list', generate_delegates_list(CEIL((NEW.height + 1) / 101::float)::int, ARRAY(SELECT ENCODE(public_key, 'hex') AS public_key FROM delegates ORDER BY rank ASC LIMIT 101)))::text);
ELSIF(TG_OP = 'DELETE') THEN PERFORM pg_notify('round-reopened', json_build_object('round', CEIL((OLD.height) / 101::float)::int, 'list', generate_delegates_list(CEIL((OLD.height) / 101::float)::int, ARRAY(SELECT ENCODE(public_key, 'hex') AS public_key FROM delegates ORDER BY rank ASC LIMIT 101)))::text);
END IF;
RETURN NULL;
END $function$;

CREATE OR REPLACE FUNCTION public.delegates_voters_balance_update()
RETURNS TABLE(updated integer)
LANGUAGE plpgsql
AS $function$
BEGIN RETURN QUERY WITH last_round AS(SELECT(CASE WHEN height < 101 THEN 1 ELSE height END) AS height FROM blocks WHERE height % 101 = 0 OR height = 1 ORDER BY height DESC LIMIT 1), current_round_txs AS(SELECT t.transaction_id FROM transactions t LEFT JOIN blocks b ON b.block_id = t.block_id WHERE b.height > (SELECT height FROM last_round)), voters AS(SELECT DISTINCT ON(voter_address) voter_address FROM votes_details), balances AS((SELECT UPPER("sender_address") AS address, -SUM(amount + fee) AS amount FROM transactions GROUP BY UPPER("sender_address")) UNION ALL(SELECT UPPER("sender_address") AS address, SUM(amount + fee) AS amount FROM transactions WHERE transaction_id IN(SELECT * FROM current_round_txs) GROUP BY UPPER("sender_address")) UNION ALL(SELECT UPPER("recipient_address") AS address, SUM(amount) AS amount FROM transactions WHERE "recipient_address"
  IS NOT NULL GROUP BY UPPER("recipient_address")) UNION ALL(SELECT UPPER("recipient_address") AS address, -SUM(amount) AS amount FROM transactions WHERE transaction_id IN(SELECT * FROM current_round_txs) AND "recipient_address"
  IS NOT NULL GROUP BY UPPER("recipient_address")) UNION ALL(SELECT d.address, d.fees + d.rewards AS amount FROM delegates d)), filtered AS(SELECT * FROM balances WHERE address IN(SELECT * FROM voters)), accounts AS(SELECT b.address, SUM(b.amount) AS balance FROM filtered b GROUP BY b.address), updated AS(UPDATE delegates SET voters_balance = balance FROM(SELECT d.public_key, ((SELECT COALESCE(SUM(balance), 0) AS balance FROM accounts WHERE address IN(SELECT v.voter_address FROM(SELECT DISTINCT ON(voter_address) voter_address, type FROM votes_details WHERE delegate_public_key = d.public_key AND height <= (SELECT height FROM last_round) ORDER BY voter_address, timestamp DESC) v WHERE v.type = 'add'))) FROM delegates d) dd WHERE delegates.public_key = dd.public_key RETURNING 1) SELECT COUNT(1)::INT FROM updated;
END $function$;

CREATE OR REPLACE FUNCTION public.delegates_voters_count_update()
RETURNS TABLE(updated integer)
LANGUAGE plpgsql
AS $function$ BEGIN RETURN QUERY WITH last_round AS(SELECT(CASE WHEN height < 101 THEN 1 ELSE height END) AS height FROM blocks WHERE height % 101 = 0 OR height = 1 ORDER BY height DESC LIMIT 1), updated AS(UPDATE delegates SET voters_count = count FROM(SELECT d.public_key, (SELECT COUNT(1) AS count FROM(SELECT DISTINCT ON(voter_address) voter_address, delegate_public_key, type FROM votes_details WHERE delegate_public_key = d.public_key AND height <= (SELECT height FROM last_round) ORDER BY voter_address, timestamp DESC) v WHERE type = 'add') FROM delegates d) dd WHERE delegates.public_key = dd.public_key RETURNING 1) SELECT COUNT(1)::INT FROM updated;
END $function$;

CREATE OR REPLACE FUNCTION public.generate_delegates_list(round integer, delegates text[])
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
AS $function$ DECLARE i int;
x int;
n int;
old text;
hash bytea;
len int;
BEGIN IF round IS NULL OR round < 1 OR delegates IS NULL OR array_length(delegates, 1) IS NULL OR array_length(delegates, 1) < 1 THEN RAISE invalid_parameter_value USING MESSAGE = 'Invalid parameters supplied';
END IF;
hash := digest(round::text, 'sha256');
len := array_length(delegates, 1);
i := 0;
LOOP EXIT WHEN i >= 101;
x := 0;
LOOP EXIT WHEN x >= 4 OR i >= len;
n := get_byte(hash, x) % len;
old := delegates[n + 1];
delegates[n + 1] = delegates[i + 1];
delegates[i + 1] = old;
i := i + 1;
x := x + 1;
END LOOP;
hash := digest(hash, 'sha256');
i := i + 1;
END LOOP;
RETURN delegates;
END $function$;

CREATE OR REPLACE FUNCTION public.get_delegates_list()
RETURNS text[]
LANGUAGE plpgsql
AS $function$ DECLARE list text[];
BEGIN SELECT generate_delegates_list((SELECT CEIL((height + 1) / 101::float)::int AS round FROM blocks ORDER BY height DESC LIMIT 1), ARRAY(SELECT ENCODE(public_key, 'hex') AS public_key FROM delegates ORDER BY rank ASC LIMIT 101)) INTO list;
RETURN list;
END $function$;


END;
