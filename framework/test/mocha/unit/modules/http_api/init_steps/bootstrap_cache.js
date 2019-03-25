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

const _ = require('lodash');
const bootstrapCache = require('../../../../../../src/modules/http_api/init_steps/bootstrap_cache');

describe('init_steps/bootstrap_cache', () => {
	const argument = {
		components: {
			cache: {
				options: {
					enabled: true,
				},
				bootstrap: {},
			},
			logger: {},
		},
	};

	beforeEach(async () => {
		argument.components.cache.bootstrap = sinonSandbox.stub();
		argument.components.logger.debug = sinonSandbox.stub();
		await bootstrapCache(argument);
	});

	afterEach(async () => {
		sinonSandbox.restore();
	});

	it('should bootstrap the cache if it is enabled', async () => {
		expect(argument.components.cache.bootstrap).to.be.called;
	});

	it('should log message if cache is disabled', async () => {
		const cacheDisabled = _.cloneDeep(argument);
		cacheDisabled.components.cache.options.enabled = false;
		await bootstrapCache(cacheDisabled);
		expect(argument.components.logger.debug).to.be.calledWithExactly(
			'Cache not enabled'
		);
	});
});
