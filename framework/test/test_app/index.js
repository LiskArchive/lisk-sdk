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

const app = require('./app');

app
	.run()
	.then(() => app.logger.info('App started...'))
	.catch(error => {
		if (error instanceof Error) {
			app.logger.error('App stopped with error', error.message);
			app.logger.debug(error.stack);
		} else {
			app.logger.error('App stopped with error', error);
		}
		process.exit();
	});
