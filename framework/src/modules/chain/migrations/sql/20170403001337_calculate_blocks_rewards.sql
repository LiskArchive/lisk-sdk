/*
 * Copyright © 2019 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */


/*
  DESCRIPTION: Create data type and functions for calculating blocks rewards data.

  PARAMETERS: None
*/

-- Create new data type which will store block rewards info
CREATE TYPE blockRewards AS (supply bigint, start int, distance bigint, milestones bigint[][]);

-- Create function that returns blocks rewards data
-- @IMMUTABLE - always returns the same result
CREATE FUNCTION getBlockRewards() RETURNS blockRewards LANGUAGE PLPGSQL IMMUTABLE AS $$
	DECLARE
		res        blockRewards;
		supply     bigint     = 10000000000000000; -- Initial supply
		start      int        = 1451520; -- Start rewards at block (n)
		distance   bigint     = 3000000; -- Distance between each milestone
		milestones bigint[][] = ARRAY[   -- Milestones [number, reward]
			[0, 500000000], -- Initial Reward
			[1, 400000000], -- Milestone 1
			[2, 300000000], -- Milestone 2
			[3, 200000000], -- Milestone 3
			[4, 100000000]  -- Milestone 4
		];
	BEGIN
		res.supply     = supply;
		res.start      = start;
		res.distance   = distance;
		res.milestones = milestones;
	RETURN res;
END $$;

-- Create function that returns blocks rewards data
-- @IMMUTABLE - always returns the same result for the same argument
CREATE FUNCTION calcBlockReward(block_height int) RETURNS bigint LANGUAGE PLPGSQL IMMUTABLE AS $$
	DECLARE
		r blockRewards;
		m int[];
		reward bigint;
	BEGIN
		-- Return NULL if supplied height is invalid
		IF block_height IS NULL OR block_height <= 0 THEN RETURN NULL; END IF;

		-- Get blocks rewards data
		SELECT * FROM getBlockRewards() INTO r;

		-- Iterating over milestones array, m - milestone data (m[1] - milestone number, m[2] - milestone reward)
		FOREACH m SLICE 1 IN ARRAY r.milestones
		LOOP
			-- If height is inside milestone - set reward and exit loop
			IF block_height <= r.start+r.distance*m[1] THEN
				reward := m[2];
				EXIT;
			END IF;
		END LOOP;

		-- If reward exceed last milestone - set reward from last milestone
		IF reward IS NULL THEN
			reward := m[2];
		END IF;
	-- Return calculated reward
	RETURN reward;
END $$;

-- Create function that calculates current supply
-- @STABLE - for the same argument returns the same result within a single table scan
CREATE FUNCTION calcSupply(block_height int DEFAULT NULL) RETURNS bigint LANGUAGE PLPGSQL STABLE AS $$
	DECLARE
		r blockRewards;
		m int[];
		height   int;
		step     bigint;
		blocks   bigint;
		overflow bigint;
	BEGIN
		-- Return NULL if supplied height is invalid
		IF block_height <= 0 THEN RETURN NULL; END IF;

		-- Get blocks rewards data
		SELECT * FROM getBlockRewards() INTO r;
		IF block_height IS NULL THEN
			-- If no height is supplied - we use last block height for calculations
			SELECT b.height INTO height FROM blocks b ORDER BY b.height DESC LIMIT 1;
		ELSE
			-- If height is supplied - use it for calculations
			height := block_height;
		END IF;

		-- Iterating over milestones array, m - milestone data (m[1] - milestone number, m[2] - milestone reward)
		FOREACH m SLICE 1 IN ARRAY r.milestones
		LOOP
			-- Calculate step (last block of milestone)
			step := r.start-1+r.distance*m[1];
			-- Calculate amount of blocks in milestone
			blocks := height-step;
			-- If amount of blocks in milestone is positive and lower or equal distance
			IF blocks > 0 AND blocks <= r.distance THEN
				-- Calculate rewards for blocks in milestone and add to supply
				r.supply := r.supply + blocks*m[2];
			-- If amount of blocks in milestone is grater than distance
			ELSIF blocks > r.distance THEN
				-- Use distance for calculate rewards for blocks in milestone and add to supply
				r.supply := r.supply + r.distance*m[2];
			-- If amount of blocks in milestone is negative - no need to loop further, so exit the loop
			ELSE EXIT;
			END IF;
		END LOOP;

		-- Calculate amount of remaining blocks after last milestone
		overflow := height-(step+r.distance);
		IF overflow > 0 THEN
			-- Calculate rewards for remaining blocks and add to supply
			r.supply := r.supply + overflow*m[2];
		END IF;
	-- Return calculated supply
	RETURN r.supply;
END $$;
