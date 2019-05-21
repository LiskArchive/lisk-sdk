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
  DESCRIPTION: Remove migrations-related entries and migrate existing entries namespace

  PARAMETERS: None
*/

DELETE FROM "migrations" WHERE id = '20180205000000';
INSERT INTO "migrations" ("id", "name", "namespace") VALUES ('20160723182900', 'create_schema', 'network');
UPDATE "migrations" SET namespace = 'network' WHERE id IN ('20161016133824', '20170113181857', '20171207000001', '20171227155620', '20180205000002', '20180327170000', '20181106000006', '20190103000001', '20190111111557');
UPDATE "migrations" SET namespace = 'chain' WHERE namespace = 'undefined';
