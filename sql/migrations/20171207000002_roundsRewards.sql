/*
 * Delete table 'rounds_fees', related functions and triggers
 * Create table 'rounds_exceptions', calculate rewards & populate it, set triggers
 */

BEGIN;

CREATE TABLE IF NOT EXISTS rounds_exceptions (
	"round"          INT PRIMARY KEY,
	"rewards_factor" INT NOT NULL,
	"fees_factor"    INT NOT NULL,
	"fees_bonus"     BIGINT NOT NULL
);

-- Add exception for round 27040
INSERT INTO rounds_exceptions VALUES (27040, 2, 2, 10000000);

-- Drop existing table, triggers and functions
DROP TABLE IF EXISTS rounds_fees;
DROP FUNCTION IF EXISTS rounds_fees_init();
DROP TRIGGER  IF EXISTS rounds_fees_delete ON "blocks";
DROP FUNCTION IF EXISTS round_fees_delete();
DROP TRIGGER  IF EXISTS rounds_fees_insert ON "blocks";
DROP FUNCTION IF EXISTS round_fees_insert();

-- Create table 'rounds_rewards' for storing rewards
CREATE TABLE IF NOT EXISTS "rounds_rewards"(
	"height"    INT    NOT NULL,
	"timestamp" INT    NOT NULL,
	"fees"      BIGINT NOT NULL,
	"reward"    BIGINT NOT NULL,
	"round"     INT    NOT NULL,
	"pk"        BYTEA  NOT NULL
);

-- Create function that compute all rewards for previous rounds and insert them to 'rounds_rewards'
CREATE FUNCTION rounds_rewards_init() RETURNS void LANGUAGE PLPGSQL AS $$
	DECLARE
		row record;
	BEGIN
		RAISE NOTICE 'Calculating rewards for rounds, please wait...';
		FOR row IN
			SELECT
				-- Round number
				CEIL(height / 101::float)::int AS round
			FROM blocks
			-- Perform only for rounds that are completed and not present in 'rounds_rewards'
			WHERE height % 101 = 0 AND height NOT IN (SELECT height FROM rounds_rewards)
			-- Group by round
			GROUP BY CEIL(height / 101::float)::int
			-- Order by round
			ORDER BY CEIL(height / 101::float)::int ASC
		LOOP
			WITH
				-- Selecting all blocks of round, apply exception fees and rewards factor
				round AS (
					SELECT
						b.timestamp, b.height, b."generatorPublicKey" AS pk, b."totalFee" * COALESCE(e.fees_factor, 1) AS fees,
						b.reward * COALESCE(e.rewards_factor, 1) AS reward, COALESCE(e.fees_bonus, 0) AS fb
					FROM blocks b 
					LEFT JOIN rounds_exceptions e ON CEIL(b.height / 101::float)::int = e.round
					WHERE CEIL(b.height / 101::float)::int = row.round AND b.height > 1
				),
				-- Calculating total fees of round, apply exception fees bonus
				fees AS (SELECT SUM(fees) + fb AS total, FLOOR((SUM(fees) + fb) / 101) AS single FROM round GROUP BY fb),
				-- Get last delegate and timestamp of round's last block
				last AS (SELECT pk, timestamp FROM round ORDER BY height DESC LIMIT 1)
			INSERT INTO rounds_rewards
				SELECT
					-- Block height
					round.height,
					-- Timestamp of last round's block
					last.timestamp,
					-- Calculating real fee reward for delegate:
					-- Rounded fee per delegate + remaining fees if block is last one of round
					(fees.single + (CASE WHEN last.pk = round.pk AND last.timestamp = round.timestamp THEN (fees.total - fees.single * 101) ELSE 0 END)) AS fees,
					-- Block reward
					round.reward,
					-- Round
					CEIL(round.height / 101::float)::int,
					-- Delegate public key
					round.pk
				FROM last, fees, round
				-- Sort fees by block height
				ORDER BY round.height ASC;
		END LOOP;
	RETURN;
END $$;

-- Execute 'rounds_rewards_init' function
SELECT rounds_rewards_init();

-- Create function for deleting round rewards when last block of round is deleted
CREATE FUNCTION round_rewards_delete() RETURNS TRIGGER LANGUAGE PLPGSQL AS $$
	BEGIN
		DELETE FROM rounds_rewards WHERE CEIL(height / 101::float)::int = (CEIL(OLD.height / 101::float)::int);
	RETURN NULL;
END $$;

-- Create trigger that will execute 'round_rewards_delete' after deletion of last block of round
CREATE TRIGGER rounds_rewards_delete
	AFTER DELETE ON blocks
	FOR EACH ROW
	WHEN (OLD.height % 101 = 0)
	EXECUTE PROCEDURE round_rewards_delete();

-- Create function for inserting round rewards when last block of round is inserted
CREATE FUNCTION round_rewards_insert() RETURNS TRIGGER LANGUAGE PLPGSQL AS $$
	BEGIN
		WITH
			round AS (
				-- Selecting all blocks of round, apply exception fees and rewards factor
				SELECT
					b.timestamp, b.height, b."generatorPublicKey" AS pk, b."totalFee" * COALESCE(e.fees_factor, 1) AS fees,
					b.reward * COALESCE(e.rewards_factor, 1) AS reward, COALESCE(e.fees_bonus, 0) AS fb
				FROM blocks b 
				LEFT JOIN rounds_exceptions e ON CEIL(b.height / 101::float)::int = e.round
				WHERE CEIL(height / 101::float)::int = CEIL(NEW.height / 101::float)::int AND b.height > 1
			),
			-- Calculating total fees of round, apply exception fees bonus
			fees AS (SELECT SUM(fees) + fb AS total, FLOOR((SUM(fees) + fb) / 101) AS single FROM round GROUP BY fb),
			-- Get last delegate and timestamp of round's last block
			last AS (SELECT pk, timestamp FROM round ORDER BY height DESC LIMIT 1)
		INSERT INTO rounds_rewards
			SELECT
				-- Block height
				round.height,
				-- Timestamp of last round's block
				last.timestamp,
				-- Calculating real fee reward for delegate:
				-- Rounded fee per delegate + remaining fees if block is last one of round
				(fees.single + (CASE WHEN last.pk = round.pk AND last.timestamp = round.timestamp THEN (fees.total - fees.single * 101) ELSE 0 END)) AS fees,
				-- Block reward
				round.reward,
				-- Round
				CEIL(round.height / 101::float)::int,
				-- Delegate public key
				round.pk
			FROM last, fees, round
			-- Sort fees by block height
			ORDER BY round.height ASC;
	RETURN NULL;
END $$;

-- Create trigger that will execute 'round_rewards_insert' after insertion of last block of round
CREATE TRIGGER rounds_rewards_insert
	AFTER INSERT ON blocks
	FOR EACH ROW
	WHEN (NEW.height % 101 = 0)
	EXECUTE PROCEDURE round_rewards_insert();

-- Create indexes on columns of 'rounds_rewards' + additional index for round
CREATE INDEX IF NOT EXISTS "rounds_rewards_timestamp" ON rounds_rewards (timestamp);
CREATE INDEX IF NOT EXISTS "rounds_rewards_height" ON rounds_rewards (height);
CREATE INDEX IF NOT EXISTS "rounds_rewards_round" ON rounds_rewards (round);
CREATE INDEX IF NOT EXISTS "rounds_rewards_public_key" ON rounds_rewards (pk);

COMMIT;
