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
 *
 */
let lib; /* eslint-disable-line */

try {
	if (process.env.NACL_FAST === 'disable') throw new Error('Use tweetnacl');
	// Require used for conditional importing
	lib = require('./sodium'); /* eslint-disable-line */
} catch (err) {
	process.env.NACL_FAST = 'disable';
	lib = require('./nacl'); /* eslint-disable-line */
}

export default lib;
