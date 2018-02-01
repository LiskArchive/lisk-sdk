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
  DESCRIPTION: Patches any existing database that contains migration names in camel case,
               and changes them into low-case underscore.

  PARAMETERS: None
*/

UPDATE migrations SET name = lower(regexp_replace(name, E'([A-Z])', E'\_\\1','g'))
