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
  DESCRIPTION: Creates schema.

  PARAMETERS: None
*/

-- Create migrations table
CREATE TABLE IF NOT EXISTS "migrations"(
  "id" VARCHAR(22) NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL
);

-- Add new column `namespace` to identify migration's groups
ALTER TABLE "migrations" ADD COLUMN IF NOT EXISTS "namespace" TEXT;

-- Remove framework-related migration (20180205000000_underscore_patch.sql)
DELETE FROM "migrations" WHERE id = '20180205000000' AND name = 'underscore_patch';

-- Populate `namespace` with correct initial values when it exists
UPDATE "migrations" SET namespace = 'network' WHERE namespace IS NULL AND id IN ('20161016133824', '20170113181857', '20171207000001', '20171227155620', '20180205000002', '20180327170000', '20181106000006', '20190103000001', '20190111111557');
UPDATE "migrations" SET namespace = 'chain' WHERE namespace IS NULL;

-- Make `namespace` column composite primary key along with `id`
ALTER TABLE "migrations" DROP CONSTRAINT IF EXISTS "migrations_pkey";
ALTER TABLE "migrations" ADD CONSTRAINT "migrations_pkey" PRIMARY KEY ("id", "namespace");

-- Duplicate 20160723182900_create_schema.sql migration for `network` module if migration exists for `chain` module
-- That is required because 20160723182900_create_schema.sql was splited into two different files (one for each module)
INSERT INTO "migrations" ("id", "name", "namespace")
SELECT '20160723182900', 'create_schema', 'network'
WHERE EXISTS (
  SELECT * FROM "migrations" WHERE id = '20160723182900' AND name = 'create_schema' AND namespace = 'chain'
) AND NOT EXISTS (
  SELECT * FROM "migrations" WHERE id = '20160723182900' AND name = 'create_schema' AND namespace = 'network'
);
