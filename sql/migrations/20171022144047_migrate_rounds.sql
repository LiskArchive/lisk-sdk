BEGIN;

DO language plpgsql $$
BEGIN
	RAISE NOTICE 'Recreating rounds functions, please wait...';
END
$$;

/* RENAME rounds_rewards columns */
ALTER TABLE rounds_rewards RENAME "pk" to "public_key";

CREATE OR REPLACE FUNCTION public.outsiders_rollback(last_block_forger text)
RETURNS TABLE(updated integer)
LANGUAGE plpgsql
AS $function$ BEGIN RETURN QUERY WITH last_round AS(SELECT CEIL(height / 101::float)::int AS round FROM blocks ORDER BY height DESC LIMIT 1), updated AS(UPDATE delegates d SET blocks_missed_count = blocks_missed_count - 1 WHERE ENCODE(d.public_key, 'hex') IN(SELECT outsider FROM UNNEST(get_delegates_list()) outsider WHERE outsider NOT IN(SELECT ENCODE(b.
  "generator_public_key", 'hex') FROM blocks b WHERE CEIL(b.height / 101::float)::int = (SELECT round FROM last_round)) AND outsider <> last_block_forger) RETURNING 1) SELECT COUNT(1)::INT FROM updated;
END $function$;

CREATE OR REPLACE FUNCTION public.outsiders_update()
RETURNS TABLE(updated integer)
LANGUAGE plpgsql
AS $function$ BEGIN RETURN QUERY WITH last_round AS(SELECT CEIL(height / 101::float)::int AS round FROM blocks ORDER BY height DESC LIMIT 1), updated AS(UPDATE delegates d SET blocks_missed_count = blocks_missed_count + 1 WHERE ENCODE(d.public_key, 'hex') IN(SELECT outsider FROM UNNEST(get_delegates_list()) outsider WHERE outsider NOT IN(SELECT ENCODE(b.
  "generator_public_key", 'hex') FROM blocks b WHERE CEIL(b.height / 101::float)::int = (SELECT round FROM last_round))) RETURNING 1) SELECT COUNT(1)::INT FROM updated;
END $function$;

CREATE OR REPLACE FUNCTION public.round_rewards_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $function$ BEGIN WITH r AS(SELECT public_key, SUM(fees) AS fees, SUM(reward) AS rewards FROM rounds_rewards WHERE round = (CEIL(OLD.height / 101::float)::int) GROUP BY public_key) UPDATE delegates SET rewards = delegates.rewards - r.rewards, fees = delegates.fees - r.fees FROM r WHERE delegates.public_key = r.public_key;
WITH r AS(SELECT public_key, SUM(fees) AS fees, SUM(reward) AS rewards FROM rounds_rewards WHERE round = (CEIL(OLD.height / 101::float)::int) GROUP BY public_key) UPDATE accounts SET balance = accounts.balance - r.rewards - r.fees FROM r WHERE accounts.
"public_key" = r.public_key;
DELETE FROM rounds_rewards WHERE round = (CEIL(OLD.height / 101::float)::int);
RETURN NULL;
END $function$;

CREATE OR REPLACE FUNCTION public.round_rewards_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $function$ BEGIN WITH round AS(SELECT b.timestamp, b.height, b."generator_public_key"
  AS public_key, b."total_fee" * COALESCE(e.fees_factor, 1) AS fees, b.reward * COALESCE(e.rewards_factor, 1) AS reward, COALESCE(e.fees_bonus, 0) AS fb FROM blocks b LEFT JOIN rounds_exceptions e ON CEIL(b.height / 101::float)::int = e.round WHERE CEIL(b.height / 101::float)::int = CEIL(NEW.height / 101::float)::int AND b.height > 1), fees AS(SELECT SUM(fees) + fb AS total, FLOOR((SUM(fees) + fb) / 101) AS single FROM round GROUP BY fb), last AS(SELECT public_key, timestamp FROM round ORDER BY height DESC LIMIT 1) INSERT INTO rounds_rewards SELECT round.height, last.timestamp, (fees.single + (CASE WHEN last.public_key = round.public_key AND last.timestamp = round.timestamp THEN(fees.total - fees.single * 101) ELSE 0 END)) AS fees, round.reward, CEIL(round.height / 101::float)::int, round.public_key FROM last, fees, round ORDER BY round.height ASC;
WITH r AS(SELECT public_key, SUM(fees) AS fees, SUM(reward) AS rewards FROM rounds_rewards WHERE round = (CEIL(NEW.height / 101::float)::int) GROUP BY public_key) UPDATE delegates SET rewards = delegates.rewards + r.rewards, fees = delegates.fees + r.fees FROM r WHERE delegates.public_key = r.public_key;
WITH r AS(SELECT public_key, SUM(fees) AS fees, SUM(reward) AS rewards FROM rounds_rewards WHERE round = (CEIL(NEW.height / 101::float)::int) GROUP BY public_key) UPDATE accounts SET balance = accounts.balance + r.rewards + r.fees FROM r WHERE accounts."public_key" = r.public_key;
RETURN NULL;
END $function$;

CREATE OR REPLACE FUNCTION public.rounds_rewards_init()
RETURNS void
LANGUAGE plpgsql
AS $function$ DECLARE row record;
BEGIN RAISE NOTICE 'Calculating rewards for rounds, please wait...';
FOR row IN SELECT CEIL(height / 101::float)::int AS round FROM blocks WHERE height % 101 = 0 AND height NOT IN(SELECT height FROM rounds_rewards) GROUP BY CEIL(height / 101::float)::int ORDER BY CEIL(height / 101::float)::int ASC LOOP WITH round AS(SELECT b.timestamp, b.height, b.
  "generator_public_key"
  AS public_key, b.  "total_fee" * COALESCE(e.fees_factor, 1) AS fees, b.reward * COALESCE(e.rewards_factor, 1) AS reward, COALESCE(e.fees_bonus, 0) AS fb FROM blocks b LEFT JOIN rounds_exceptions e ON CEIL(b.height / 101::float)::int = e.round WHERE CEIL(b.height / 101::float)::int = row.round AND b.height > 1), fees AS(SELECT SUM(fees) + fb AS total, FLOOR((SUM(fees) + fb) / 101) AS single FROM round GROUP BY fb), last AS(SELECT public_key, timestamp FROM round ORDER BY height DESC LIMIT 1) INSERT INTO rounds_rewards SELECT round.height, last.timestamp, (fees.single + (CASE WHEN last.public_key = round.public_key AND last.timestamp = round.timestamp THEN(fees.total - fees.single * 101) ELSE 0 END)) AS fees, round.reward, CEIL(round.height / 101::float)::int, round.public_key FROM last, fees, round ORDER BY round.height ASC;
END LOOP;
RETURN;
END $function$;

END;
