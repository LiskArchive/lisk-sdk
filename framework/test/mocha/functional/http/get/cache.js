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

require('../../functional');
const Promise = require('bluebird');
const SwaggerEndpoint = require('../../../common/swagger_spec');
const accountFixtures = require('../../../fixtures/accounts');
const {
	createLoggerComponent,
} = require('../../../../../src/components/logger');
const { createCacheComponent } = require('../../../../../src/components/cache');
const apiHelpers = require('../../../common/helpers/api');
const waitFor = require('../../../common/utils/wait_for');

const waitForBlocksPromise = Promise.promisify(waitFor.blocks);
const onNewRoundPromise = Promise.promisify(waitFor.newRound);
const expectSwaggerParamError = apiHelpers.expectSwaggerParamError;

describe('cached endpoints', () => {
	let cache;

	before(async () => {
		__testContext.config.cacheEnabled = true;
		this.logger = createLoggerComponent({
			echo: null,
			errorLevel: __testContext.config.fileLogLevel,
			filename: __testContext.config.logFileName,
		});

		cache = createCacheComponent(__testContext.config.redis, this.logger);
		await cache.bootstrap();
		expect(cache).to.be.an('object');
	});

	afterEach(async () => {
		const result = await cache.flushDb();
		return expect(result).to.equal('OK');
	});

	after(() => {
		return cache.quit();
	});

	describe('GET /transactions', () => {
		const transactionsEndpoint = new SwaggerEndpoint('GET /transactions');

		it('cache transactions by the url and parameters when response is a success', async () => {
			const params = {
				senderId: accountFixtures.genesis.address,
			};

			return transactionsEndpoint.makeRequest(params, 200).then(res => {
				return Promise.all(
					[0, 10, 100].map(async delay => {
						await Promise.delay(delay);
						return cache.getJsonForKey(res.req.path);
					})
				).then(responses => {
					expect(responses).to.deep.include(res.body);
				});
			});
		});

		it('should not cache if response is not a success', async () => {
			const params = {
				whateversenderId: accountFixtures.genesis.address,
			};

			return transactionsEndpoint.makeRequest(params, 400).then(res => {
				expect(res)
					.to.have.property('status')
					.to.equal(400);
				expect(res).to.have.nested.property('body.message');

				return cache.getJsonForKey(res.req.path).then(response => {
					expect(response).to.eql(null);
				});
			});
		});
	});

	describe('GET /blocks', () => {
		const blocksEndpoint = new SwaggerEndpoint('GET /blocks');

		it('cache blocks by the url and parameters when response is a success', async () => {
			const params = {
				height: '1',
			};
			let initialResponse = null;

			return blocksEndpoint
				.makeRequest(params, 200)
				.then(res => {
					initialResponse = res;
					return Promise.all(
						[0, 10, 100].map(delay => {
							return Promise.delay(delay).then(() => {
								return cache.getJsonForKey(res.req.path);
							});
						})
					);
				})
				.then(responses => {
					expect(responses).to.deep.include(initialResponse.body);
				});
		});

		it('should not cache if response is not a success', async () => {
			return blocksEndpoint
				.makeRequest({ height: -100 }, 400)
				.then(res => {
					expectSwaggerParamError(res, 'height');
					return cache.getJsonForKey(res.req.path);
				})
				.then(response => {
					expect(response).to.eql(null);
				});
		});

		it('should remove entry from cache on new block', async () => {
			const params = {
				height: 1,
			};

			let initialResponse = null;

			return blocksEndpoint
				.makeRequest(params, 200)
				.then(res => {
					initialResponse = res;
					return Promise.all(
						[0, 10, 100].map(delay => {
							return Promise.delay(delay).then(() => {
								return cache.getJsonForKey(res.req.path);
							});
						})
					);
				})
				.then(responses => {
					expect(responses).to.deep.include(initialResponse.body);
				})
				.then(() => {
					return waitForBlocksPromise(1, null);
				})
				.then(() => {
					return cache.getJsonForKey(initialResponse.req.path);
				})
				.then(result => {
					expect(result).to.eql(null);
				});
		});
	});

	describe('GET /delegates', () => {
		const delegatesEndpoint = new SwaggerEndpoint('GET /delegates');

		it('should cache delegates when response is successful', async () => {
			return delegatesEndpoint.makeRequest({}, 200).then(res => {
				return Promise.all(
					[0, 10, 100].map(delay => {
						return Promise.delay(delay).then(() => {
							return cache.getJsonForKey(res.req.path);
						});
					})
				).then(responses => {
					expect(responses).to.deep.include(res.body);
				});
			});
		});

		it('should not cache delegates when response is unsuccessful', async () => {
			const params = {
				sort: 'invalidValue',
			};

			return delegatesEndpoint.makeRequest(params, 400).then(res => {
				return cache.getJsonForKey(res.req.path).then(response => {
					expect(response).to.not.exist;
				});
			});
		});
	});

	describe('@slow tests', () => {
		describe('GET /delegates', () => {
			const delegatesEndpoint = new SwaggerEndpoint('GET /delegates');

			it('should flush cache on the next round @slow', async () => {
				const params = {
					username: 'genesis_90',
				};
				let urlPath;

				return delegatesEndpoint.makeRequest(params, 200).then(res => {
					urlPath = res.req.path;
					// Check key in cache after, 0, 10, 100 ms, and if value exists in any of this time period we respond with success
					return Promise.all(
						[0, 10, 100].map(delay => {
							return Promise.delay(delay).then(() => {
								return cache.getJsonForKey(urlPath);
							});
						})
					).then(responses => {
						expect(responses).to.deep.include(res.body);
						return onNewRoundPromise(null).then(() => {
							return cache.getJsonForKey(urlPath).then(result => {
								expect(result).to.not.exist;
							});
						});
					});
				});
			});
		});
	});
});
