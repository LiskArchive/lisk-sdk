/*
 * Copyright © 2018 Lisk Foundation
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
  DESCRIPTION: Add `namespace` column to migrations table
    and replace primary key by a composite key using id and namespace

  PARAMETERS: None
*/

ALTER TABLE "migrations" ADD COLUMN IF NOT EXISTS "namespace" TEXT NOT NULL DEFAULT 'undefined';
ALTER TABLE "migrations" DROP CONSTRAINT IF EXISTS "migrations_pkey";
ALTER TABLE "migrations" ADD CONSTRAINT IF NOT EXISTS "migrations_pkey" PRIMARY KEY ("id", "namespace");
