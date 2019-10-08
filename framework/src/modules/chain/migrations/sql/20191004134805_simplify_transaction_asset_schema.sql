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
  DESCRIPTION: Simplifies the schema for the 'asset' field in the transactions table 'trs'
  - For second signature registration moves the object in 'signature' to the root level of the asset field
  - For delegate registration transactions moves the object in 'delegate' to the root level of the asset field
  - For vote transactions no changes required as the asset field already contains voted public keys at the root level
  - For multisignature transactions moves the object in 'multisignature' to the root level of the asset field
  PARAMETERS: None
*/


-- Update 2nd signatures transaction assets
UPDATE trs 
SET asset = asset->'signature'
WHERE asset->'signature' IS NOT NULL;


-- Update delegate registration transaction assets
UPDATE trs 
SET asset = asset->'delegate'
WHERE asset->'delegate' IS NOT NULL;


-- Update multisignature registration transaction assets
UPDATE trs
SET asset = asset->'multisignature'
WHERE asset->'multisignature' IS NOT NULL;

