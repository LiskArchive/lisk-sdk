/* eslint-disable mocha/no-pending-tests */
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

'use strict';

var config = __testContext.config;

describe('app', () => {
	before(done => {
		// Run the app on a different than default port
		process.argv.splice(2, 0, '--');
		process.argv.splice(2, 0, (config.httpPort += 1).toString());
		process.argv.splice(2, 0, '-h');
		process.argv.splice(2, 0, (config.wsPort += 1).toString());
		process.argv.splice(2, 0, '-p');

		require('../../../app');
		// Wait for modules to be initialized
		setTimeout(done, 5000);
	});

	it('should be ok');
});
