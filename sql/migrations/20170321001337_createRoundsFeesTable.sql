/*
 * Create table 'rounds_rewards', calculate rewards & populate it, set triggers
 */

BEGIN;

-- Create table 'rounds_rewards' for storing rewards
CREATE TABLE IF NOT EXISTS "rounds_rewards"(
	"timestamp" INT     NOT NULL,
	"fees"      BIGINT  NOT NULL,
	"round"     INT     NOT NULL,
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
		FOR row IN
			SELECT
				CEIL(height / 101::float)::int AS round
			FROM blocks
			WHERE height % 101 = 0 AND CEIL(height / 101::float)::int NOT IN (SELECT DISTINCT round FROM rounds_rewards)
			GROUP BY CEIL(height / 101::float)::int
			ORDER BY CEIL(height / 101::float)::int ASC
		LOOP
			WITH
			round AS (SELECT timestamp, height, "generatorPublicKey", "totalFee", CEIL(height / 101::float)::int AS round FROM blocks WHERE CEIL(height / 101::float)::int = row.round),
			summary AS (
				SELECT
					"generatorPublicKey",
					(SELECT SUM("totalFee") FROM round) AS fees,
					(SELECT COUNT(1) FROM round WHERE "generatorPublicKey" = test."generatorPublicKey") AS cnt,
					(CASE WHEN (SELECT "generatorPublicKey" FROM round ORDER BY height DESC LIMIT 1) = "generatorPublicKey" THEN 1 ELSE 0 END) AS last
				FROM round AS test GROUP BY "generatorPublicKey")
			INSERT INTO rounds_rewards
				SELECT
					(SELECT MAX(timestamp) FROM round) as timestamp,
					(floor(fees/101)*cnt + (CASE WHEN last = 1 THEN (fees-floor(fees/101)*101) ELSE 0 END)) AS fees,
					CEIL((SELECT height FROM round LIMIT 1) / 101::float)::int AS round,
					"generatorPublicKey" AS "publicKey"
				FROM summary;
		END LOOP;
	RETURN;
END $$;

-- Execute 'rounds_rewards_init' function
SELECT rounds_rewards_init();

-- Create indexes on all columns of 'rounds_rewards'
CREATE INDEX IF NOT EXISTS "rounds_rewards_timestamp" ON "rounds_rewards" ("timestamp");
CREATE INDEX IF NOT EXISTS "rounds_rewards_fees" ON "rounds_rewards" ("fees");
CREATE INDEX IF NOT EXISTS "rounds_rewards_round" ON "rounds_rewards" ("round");
CREATE INDEX IF NOT EXISTS "rounds_rewards_public_key" ON "rounds_rewards" ("publicKey");

-- Create function for deleting round rewards when last block of round is deleted
CREATE FUNCTION round_rewards_delete() RETURNS TRIGGER LANGUAGE PLPGSQL AS $$
	BEGIN
		DELETE FROM rounds_rewards WHERE round = (CEIL(OLD.height / 101::float)::int);
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
		borders AS (SELECT ((CEIL(NEW.height / 101::float)::int-1)*101)+1 AS min, CEIL(NEW.height / 101::float)::int*101 AS max),
		round AS (SELECT timestamp, height, "generatorPublicKey", "totalFee", CEIL(height / 101::float)::int AS round FROM blocks WHERE height BETWEEN (SELECT min FROM borders) AND (SELECT max FROM borders) ORDER BY height DESC),
		summary AS (
			SELECT
				"generatorPublicKey",
				(SELECT SUM("totalFee") FROM round) AS fees,
				(SELECT COUNT(1) FROM round WHERE "generatorPublicKey" = test."generatorPublicKey") AS cnt,
				(CASE WHEN (SELECT "generatorPublicKey" FROM round ORDER BY height DESC LIMIT 1) = "generatorPublicKey" THEN 1 ELSE 0 END) AS last
			FROM round AS test GROUP BY "generatorPublicKey")
		INSERT INTO rounds_rewards
			SELECT
				(SELECT MAX(timestamp) FROM round) as timestamp,
				(floor(fees/101)*cnt + (CASE WHEN last = 1 THEN (fees-floor(fees/101)*101) ELSE 0 END)) AS fees,
				CEIL((SELECT height FROM round LIMIT 1) / 101::float)::int AS round,
				"generatorPublicKey" AS "publicKey"
			FROM summary;
	RETURN NULL;
END $$;

-- Create trigger that will execute 'round_rewards_insert' after insertion of last block of round
CREATE TRIGGER rounds_rewards_insert
	AFTER INSERT ON blocks
	FOR EACH ROW
	WHEN (NEW.height % 101 = 0)
	EXECUTE PROCEDURE round_rewards_insert();

COMMIT;
