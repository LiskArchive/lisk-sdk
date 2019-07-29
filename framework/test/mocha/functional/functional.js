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

'use strict';

// eslint-disable-next-line mocha/no-top-level-hooks
before(done => {
	// Retry 20 times with 3 second gap
	require('../common/utils/wait_for').blockchainReady(
		20,
		3000,
		null,
		null,
		reason => {
			console.info(`Blockchain ready status: ${reason}`);
			done();
		}
	);
});
