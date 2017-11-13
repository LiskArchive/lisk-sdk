BEGIN;

DO language plpgsql $$
BEGIN
	RAISE NOTICE 'Blocks table migration, please wait...';
END
$$;

/* Migrate blocks table */ /* Rename all columns for new schema */
ALTER TABLE blocks RENAME id TO "block_id";
ALTER TABLE blocks RENAME "rowId" TO "row_id";
ALTER TABLE blocks RENAME "previousBlock" TO "previous_block_id";
ALTER TABLE blocks RENAME "numberOfTransactions" TO "total_transactions";
ALTER TABLE blocks RENAME "totalAmount" TO "total_amount";
ALTER TABLE blocks RENAME "totalFee" TO "total_fee";
ALTER TABLE blocks RENAME "payloadLength" TO "payload_length";
ALTER TABLE blocks RENAME "payloadHash" TO "payload_hash";
ALTER TABLE blocks RENAME "generatorPublicKey" TO "generator_public_key";
ALTER TABLE blocks RENAME "blockSignature" TO "signature";


-- Blocks indexes/constraints
ALTER SEQUENCE "public"."blocks_rowId_seq" RENAME TO "seq_blocks_row_id";
ALTER INDEX "blocks_pkey" RENAME TO "idx_blocks_pkey";
ALTER INDEX "blocks_height" RENAME TO "idx_blocks_height";
ALTER INDEX "blocks_previousBlock" RENAME TO "idx_blocks_previous_block_id";
ALTER INDEX "blocks_generator_public_key" RENAME TO "idx_blocks_generator_public_key";
ALTER INDEX "blocks_reward" RENAME TO "idx_blocks_reward";
ALTER INDEX "blocks_rounds" RENAME TO "idx_blocks_rounds";
ALTER INDEX "blocks_timestamp" RENAME TO "idx_blocks_timestamp";
ALTER INDEX "blocks_numberOfTransactions" RENAME TO "idx_blocks_total_transactions";
ALTER INDEX "blocks_rowId" RENAME TO "idx_blocks_row_id";
ALTER INDEX "blocks_totalAmount" RENAME TO "idx_blocks_total_amount";
ALTER INDEX "blocks_totalFee" RENAME TO "idx_blocks_total_fee";
ALTER TABLE "public".blocks DROP CONSTRAINT "blocks_previousBlock_fkey";

ALTER TABLE "public".blocks ADD CONSTRAINT "fkey_blocks_previous_block_id_fkey" FOREIGN KEY ( "previous_block_id" ) REFERENCES "public".blocks( block_id ) ON  DELETE SET NULL;

--Create new data type which will store block rewards info

DROP FUNCTION IF EXISTS getblockrewards();
DROP FUNCTION IF EXISTS calcblockreward();
DROP FUNCTION IF EXISTS calcsupply();
DROP FUNCTION IF EXISTS calcsupply_test();

DROP TYPE blockRewards;


CREATE TYPE block_rewards AS
 (supply bigint, START int, distance bigint, milestones bigint[][]);

-- Begin functions:

CREATE OR REPLACE FUNCTION public.calculate_block_reward(block_height integer) RETURNS bigint LANGUAGE PLPGSQL IMMUTABLE AS $function$
	DECLARE r block_rewards; mile int;
	BEGIN
			IF block_height IS NULL OR block_height <= 0 THEN RETURN NULL;
		END IF;
			SELECT * FROM get_block_rewards() INTO r; IF block_height < r.start THEN RETURN 0;
		END IF;
			mile := FLOOR((block_height-r.start)/r.distance)+1;
			IF mile > array_length(r.milestones, 1) THEN mile := array_length(r.milestones, 1);
		END IF;
			RETURN r.milestones[mile];
	END $function$ ;


CREATE OR REPLACE FUNCTION public.calculate_supply(block_height integer) RETURNS bigint LANGUAGE PLPGSQL IMMUTABLE AS $function$
	DECLARE
		r block_rewards; mile int;
	BEGIN
		IF block_height IS NULL OR block_height <= 0
			THEN RETURN NULL;
		END IF;
			SELECT * FROM get_block_rewards() INTO r; IF block_height < r.start THEN RETURN r.supply;
		END IF;
		mile := FLOOR((block_height-r.start)/r.distance)+1;
		IF mile > array_length(r.milestones, 1) THEN mile := array_length(r.milestones, 1);
		END IF;
		FOR m IN 1..mile LOOP
			IF m = mile
				THEN r.supply := r.supply + (block_height-r.start+1-r.distance*(m-1))*r.milestones[m];
				ELSE r.supply := r.supply + r.distance*r.milestones[m];
			END IF;
		END LOOP;
	RETURN r.supply;
	END $function$ ;


CREATE OR REPLACE FUNCTION public.calculate_supply_test(height_start integer, height_end integer, expected_reward bigint) RETURNS boolean LANGUAGE PLPGSQL IMMUTABLE AS $function$
	DECLARE
		supply bigint;
		prev_supply bigint;
	BEGIN
		SELECT calculate_supply(height_start-1) INTO prev_supply;
			FOR height IN height_start..height_end LOOP
				SELECT calculate_supply(height) INTO supply;
				IF (prev_supply+expected_reward) <> supply THEN RETURN false;
				END IF;
				prev_supply := supply;
			END LOOP;
		RETURN true;
	END $function$ ;


CREATE OR REPLACE FUNCTION public.get_block_rewards() RETURNS block_rewards LANGUAGE PLPGSQL IMMUTABLE AS $function$
	DECLARE res block_rewards;
		supply bigint = 10000000000000000;
		start int = 1451520;
		distance bigint = 3000000;
		milestones bigint[] = ARRAY[ 500000000, 400000000, 300000000, 200000000, 100000000 ];
	BEGIN
		res.supply = supply;
		res.start = start;
		res.distance = distance;
		res.milestones = milestones;
		RETURN res;
	END $function$ ;

END;
