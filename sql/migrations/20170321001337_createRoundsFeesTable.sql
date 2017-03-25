/*
 * Create table 'rounds_rewards', calculate rewards & populate it, set triggers
 */

BEGIN;

-- Create table 'rounds_rewards' for storing rewards
CREATE TABLE IF NOT EXISTS "rounds_rewards"(
	"height"    INT     NOT NULL,
	"timestamp" INT     NOT NULL,
	"fees"      BIGINT  NOT NULL,
	"publicKey" BYTEA   NOT NULL
);

-- Drop existing triggers and functions
DROP FUNCTION IF EXISTS rounds_rewards_init();
DROP TRIGGER  IF EXISTS rounds_rewards_delete ON "blocks";
DROP FUNCTION IF EXISTS round_rewards_delete();
DROP TRIGGER  IF EXISTS rounds_rewards_insert ON "blocks";
DROP FUNCTION IF EXISTS round_rewards_insert();

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
				-- Selecting all blocks of round
				round AS (SELECT timestamp, height, "generatorPublicKey", "totalFee" FROM blocks WHERE CEIL(height / 101::float)::int = row.round),
				-- Calculating total fees of round
				fees AS (SELECT SUM("totalFee") AS total, FLOOR(SUM("totalFee") / 101) AS single FROM round),
				-- Get last delegate and timestamp of round's last block
				last AS (SELECT "generatorPublicKey" AS pk, timestamp FROM round ORDER BY height DESC LIMIT 1)
			INSERT INTO rounds_rewards
				SELECT
					-- Block height
					round.height,
					-- Timestamp of last round's block
					last.timestamp,
					-- Calculating real fee reward for delegate:
					-- Rounded fee per delegate + remaining fees if block is last one of round
					(fees.single + (CASE WHEN last.pk = round."generatorPublicKey" AND last.timestamp = round.timestamp THEN (fees.total - fees.single * 101) ELSE 0 END)) AS fees,
					-- Delgate public key
					round."generatorPublicKey" AS "publicKey"
				FROM last, fees, round
				-- Sort rewards by block height
				ORDER BY round.height ASC;
		END LOOP;
	RETURN;
END $$;
--Execution tim

-- Execute 'rounds_rewards_init' function
SELECT rounds_rewards_init();

-- Create indexes on all columns of 'rounds_rewards' + additional index for round
CREATE INDEX IF NOT EXISTS "rounds_rewards_timestamp" ON "rounds_rewards" ("timestamp");
CREATE INDEX IF NOT EXISTS "rounds_rewards_fees" ON "rounds_rewards" ("fees");
CREATE INDEX IF NOT EXISTS "rounds_rewards_height" ON "rounds_rewards" ("height");
CREATE INDEX IF NOT EXISTS "rounds_rewards_round" ON "rounds_rewards" ((CEIL(height / 101::float)::int));
CREATE INDEX IF NOT EXISTS "rounds_rewards_public_key" ON "rounds_rewards" ("publicKey");

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
			-- Selecting all blocks of round
			round AS (SELECT timestamp, height, "generatorPublicKey", "totalFee" FROM blocks WHERE CEIL(height / 101::float)::int = CEIL(NEW.height / 101::float)::int),
			-- Calculating total fees of round
			fees AS (SELECT SUM("totalFee") AS total, FLOOR(SUM("totalFee") / 101) AS single FROM round),
			-- Get last delegate and timestamp of round's last block
			last AS (SELECT "generatorPublicKey" AS pk, timestamp FROM round ORDER BY height DESC LIMIT 1)
		INSERT INTO rounds_rewards
			SELECT
				-- Block height
				round.height,
				-- Timestamp of last round's block
				last.timestamp,
				-- Calculating real fee reward for delegate:
				-- Rounded fee per delegate + remaining fees if block is last one of round
				(fees.single + (CASE WHEN last.pk = round."generatorPublicKey" AND last.timestamp = round.timestamp THEN (fees.total - fees.single * 101) ELSE 0 END)) AS fees,
				-- Delgate public key
				round."generatorPublicKey" AS "publicKey"
			FROM last, fees, round
			-- Sort rewards by block height
			ORDER BY round.height ASC;
	RETURN NULL;
END $$;

-- Create trigger that will execute 'round_rewards_insert' after insertion of last block of round
CREATE TRIGGER rounds_rewards_insert
	AFTER INSERT ON blocks
	FOR EACH ROW
	WHEN (NEW.height % 101 = 0)
	EXECUTE PROCEDURE round_rewards_insert();

COMMIT;
