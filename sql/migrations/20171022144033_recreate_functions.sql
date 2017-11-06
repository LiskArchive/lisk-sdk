BEGIN;

DO language plpgsql $$
BEGIN
	RAISE NOTICE 'Recreating database functions, please wait...';
END
$$;

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
END $function$
;

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
END $function$
;

CREATE OR REPLACE FUNCTION public.delegates_voters_count_update()
RETURNS TABLE(updated integer)
LANGUAGE plpgsql
AS $function$ BEGIN RETURN QUERY WITH last_round AS(SELECT(CASE WHEN height < 101 THEN 1 ELSE height END) AS height FROM blocks WHERE height % 101 = 0 OR height = 1 ORDER BY height DESC LIMIT 1), updated AS(UPDATE delegates SET voters_count = count FROM(SELECT d.public_key, (SELECT COUNT(1) AS count FROM(SELECT DISTINCT ON(voter_address) voter_address, delegate_public_key, type FROM votes_details WHERE delegate_public_key = d.public_key AND height <= (SELECT height FROM last_round) ORDER BY voter_address, timestamp DESC) v WHERE type = 'add') FROM delegates d) dd WHERE delegates.public_key = dd.public_key RETURNING 1) SELECT COUNT(1)::INT FROM updated;
END $function$
;

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
hash: = digest(round::text, 'sha256');
len: = array_length(delegates, 1);
i: = 0;
LOOP EXIT WHEN i >= 101;
x: = 0;
LOOP EXIT WHEN x >= 4 OR i >= len;
n: = get_byte(hash, x) % len;
old: = delegates[n + 1];
delegates[n + 1] = delegates[i + 1];
delegates[i + 1] = old;
i: = i + 1;
x: = x + 1;
END LOOP;
hash: = digest(hash, 'sha256');
i: = i + 1;
END LOOP;
RETURN delegates;
END $function$
;

CREATE OR REPLACE FUNCTION public.get_delegates_list()
RETURNS text[]
LANGUAGE plpgsql
AS $function$ DECLARE list text[];
BEGIN SELECT generate_delegates_list((SELECT CEIL((height + 1) / 101::float)::int AS round FROM blocks ORDER BY height DESC LIMIT 1), ARRAY(SELECT ENCODE(public_key, 'hex') AS public_key FROM delegates ORDER BY rank ASC LIMIT 101)) INTO list;
RETURN list;
END $function$
;


CREATE OR REPLACE FUNCTION public.outsiders_rollback(last_block_forger text)
RETURNS TABLE(updated integer)
LANGUAGE plpgsql
AS $function$ BEGIN RETURN QUERY WITH last_round AS(SELECT CEIL(height / 101::float)::int AS round FROM blocks ORDER BY height DESC LIMIT 1), updated AS(UPDATE delegates d SET blocks_missed_count = blocks_missed_count - 1 WHERE ENCODE(d.public_key, 'hex') IN(SELECT outsider FROM UNNEST(get_delegates_list()) outsider WHERE outsider NOT IN(SELECT ENCODE(b.
  "generator_public_key", 'hex') FROM blocks b WHERE CEIL(b.height / 101::float)::int = (SELECT round FROM last_round)) AND outsider < > last_block_forger) RETURNING 1) SELECT COUNT(1)::INT FROM updated;
END $function$
;

CREATE OR REPLACE FUNCTION public.outsiders_update()
RETURNS TABLE(updated integer)
LANGUAGE plpgsql
AS $function$ BEGIN RETURN QUERY WITH last_round AS(SELECT CEIL(height / 101::float)::int AS round FROM blocks ORDER BY height DESC LIMIT 1), updated AS(UPDATE delegates d SET blocks_missed_count = blocks_missed_count + 1 WHERE ENCODE(d.public_key, 'hex') IN(SELECT outsider FROM UNNEST(get_delegates_list()) outsider WHERE outsider NOT IN(SELECT ENCODE(b.
  "generator_public_key", 'hex') FROM blocks b WHERE CEIL(b.height / 101::float)::int = (SELECT round FROM last_round))) RETURNING 1) SELECT COUNT(1)::INT FROM updated;
END $function$
;

CREATE OR REPLACE FUNCTION public.round_rewards_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $function$ BEGIN WITH r AS(SELECT public_key, SUM(fees) AS fees, SUM(reward) AS rewards FROM rounds_rewards WHERE round = (CEIL(OLD.height / 101::float)::int) GROUP BY public_key) UPDATE delegates SET rewards = delegates.rewards - r.rewards, fees = delegates.fees - r.fees FROM r WHERE delegates.public_key = r.public_key;
WITH r AS(SELECT public_key, SUM(fees) AS fees, SUM(reward) AS rewards FROM rounds_rewards WHERE round = (CEIL(OLD.height / 101::float)::int) GROUP BY public_key) UPDATE accounts SET balance = accounts.balance - r.rewards - r.fees FROM r WHERE accounts.
"publicKey" = r.public_key;
DELETE FROM rounds_rewards WHERE round = (CEIL(OLD.height / 101::float)::int);
RETURN NULL;
END $function$
;

CREATE OR REPLACE FUNCTION public.round_rewards_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $function$ BEGIN WITH round AS(SELECT b.timestamp, b.height, b.
  "generator_public_key"
  AS public_key, b.
  "total_fee" * COALESCE(e.fees_factor, 1) AS fees, b.reward * COALESCE(e.rewards_factor, 1) AS reward, COALESCE(e.fees_bonus, 0) AS fb FROM blocks b LEFT JOIN rounds_exceptions e ON CEIL(b.height / 101::float)::int = e.round WHERE CEIL(b.height / 101::float)::int = CEIL(NEW.height / 101::float)::int AND b.height > 1), fees AS(SELECT SUM(fees) + fb AS total, FLOOR((SUM(fees) + fb) / 101) AS single FROM round GROUP BY fb), last AS(SELECT public_key, timestamp FROM round ORDER BY height DESC LIMIT 1) INSERT INTO rounds_rewards SELECT round.height, last.timestamp, (fees.single + (CASE WHEN last.public_key = round.public_key AND last.timestamp = round.timestamp THEN(fees.total - fees.single * 101) ELSE 0 END)) AS fees, round.reward, CEIL(round.height / 101::float)::int, round.public_key FROM last, fees, round ORDER BY round.height ASC;
WITH r AS(SELECT public_key, SUM(fees) AS fees, SUM(reward) AS rewards FROM rounds_rewards WHERE round = (CEIL(NEW.height / 101::float)::int) GROUP BY public_key) UPDATE delegates SET rewards = delegates.rewards + r.rewards, fees = delegates.fees + r.fees FROM r WHERE delegates.public_key = r.public_key;
WITH r AS(SELECT public_key, SUM(fees) AS fees, SUM(reward) AS rewards FROM rounds_rewards WHERE round = (CEIL(NEW.height / 101::float)::int) GROUP BY public_key) UPDATE accounts SET balance = accounts.balance + r.rewards + r.fees FROM r WHERE accounts.
"public_key" = r.public_key;
RETURN NULL;
END $function$
;

CREATE OR REPLACE FUNCTION public.rounds_rewards_init()
RETURNS void
LANGUAGE plpgsql
AS $function$ DECLARE row record;
BEGIN RAISE NOTICE 'Calculating rewards for rounds, please wait...';
FOR row IN SELECT CEIL(height / 101::float)::int AS round FROM blocks WHERE height % 101 = 0 AND height NOT IN(SELECT height FROM rounds_rewards) GROUP BY CEIL(height / 101::float)::int ORDER BY CEIL(height / 101::float)::int ASC LOOP WITH round AS(SELECT b.timestamp, b.height, b.
  "generator_public_key"
  AS public_key, b.
  "total_fee" * COALESCE(e.fees_factor, 1) AS fees, b.reward * COALESCE(e.rewards_factor, 1) AS reward, COALESCE(e.fees_bonus, 0) AS fb FROM blocks b LEFT JOIN rounds_exceptions e ON CEIL(b.height / 101::float)::int = e.round WHERE CEIL(b.height / 101::float)::int = row.round AND b.height > 1), fees AS(SELECT SUM(fees) + fb AS total, FLOOR((SUM(fees) + fb) / 101) AS single FROM round GROUP BY fb), last AS(SELECT public_key, timestamp FROM round ORDER BY height DESC LIMIT 1) INSERT INTO rounds_rewards SELECT round.height, last.timestamp, (fees.single + (CASE WHEN last.public_key = round.public_key AND last.timestamp = round.timestamp THEN(fees.total - fees.single * 101) ELSE 0 END)) AS fees, round.reward, CEIL(round.height / 101::float)::int, round.public_key FROM last, fees, round ORDER BY round.height ASC;
END LOOP;
RETURN;
END $function$
;

COMMIT;
END;
