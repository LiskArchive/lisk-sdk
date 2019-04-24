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

const { createCacheComponent } = require('../../../../../src/components/cache');
const {
	createLoggerComponent,
} = require('../../../../../src/components/logger');

describe('components: cache', () => {
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
		return expect(cache).to.be.an('object');
	});

	afterEach(async () => {
		// Cache might be disabled in the tests,
		// So next line makes sure it's enabled again.
		cache.enable();
		const result = await cache.flushDb();
		return expect(result).to.equal('OK');
	});

	after(() => cache.quit());

	describe('bootstrap', () => {});

	describe('_onReady', () => {});

	describe('isReady', () => {});

	describe('enable', () => {});

	describe('disable', () => {});

	describe('getJsonForKey', () => {
		it('should return null for non-existent key', async () => {
			const key = 'test_key';

			const value = await cache.getJsonForKey(key);
			expect(value).to.equal(null);
		});

		it('should get the correct value for the key', async () => {
			const key = 'test_key';
			const value = { testObject: 'testValue' };

			const result = await cache.setJsonForKey(key, value);
			expect(result).to.equal('OK');
			const res = await cache.getJsonForKey(key);
			expect(res).to.eql(value);
		});

		it('should not get any key when cache is not ready', async () => {
			const key = '/api/transactions';

			cache.disable();
			try {
				await cache.getJsonForKey(key);
			} catch (getJsonForKeyErr) {
				expect(getJsonForKeyErr.message).to.equal('Cache Disabled');
			}
		});
	});

	describe('setJsonForKey', () => {
		it('should set the key value correctly', async () => {
			const key = 'test_key';
			const value = {
				testObject: 'testValue',
			};

			const result = await cache.setJsonForKey(key, value);
			expect(result).to.equal('OK');
			const res = await cache.getJsonForKey(key);
			expect(res).to.eql(value);
		});

		it('should not set any key when cache is not ready', async () => {
			const key = '/api/transactions';
			const value = {
				testObject: 'testValue',
			};

			cache.disable();
			try {
				await cache.setJsonForKey(key, value);
			} catch (setJsonForKeyErr) {
				expect(setJsonForKeyErr.message).to.equal('Cache Disabled');
			}
		});
	});

	describe('deleteJsonForKey', () => {
		it('should return 0 for non-existent key', async () => {
			const key = 'test_key';

			const value = await cache.deleteJsonForKey(key);
			expect(value).to.equal(0);
		});

		it('should delete the correct value for the key', async () => {
			const key = 'test_key';
			const value = {
				testObject: 'testValue',
			};

			const result = await cache.setJsonForKey(key, value);
			expect(result).to.equal('OK');
			const res = await cache.getJsonForKey(key);
			expect(res).to.eql(value);
			const deleteJsonForKeyRes = await cache.deleteJsonForKey(key);
			expect(deleteJsonForKeyRes).to.equal(1);
			const getJsonForKeyAfterDelete = await cache.getJsonForKey(key);
			expect(getJsonForKeyAfterDelete).to.eql(null);
		});

		it('should not delete any key when cache is not ready', async () => {
			const key = '/api/transactions';

			cache.disable();
			try {
				await cache.deleteJsonForKey(key);
			} catch (deleteJsonForKeyErr) {
				expect(deleteJsonForKeyErr.message).to.equal('Cache Disabled');
			}
		});
	});

	describe('removeByPattern', () => {
		it('should remove keys matching the pattern', async () => {
			const key = '/api/transactions?123';
			const key2 = '/api/transactions?1234';
			const value = { testObject: 'testValue' };
			const pattern = '/api/transactions*';

			const result = await cache.setJsonForKey(key, value);
			expect(result).to.equal('OK');
			const result2 = await cache.setJsonForKey(key2, value);
			expect(result2).to.equal('OK');
			await cache.removeByPattern(pattern);
			const res = await cache.getJsonForKey(key);
			expect(res).to.equal(null);
			const res2 = await cache.getJsonForKey(key2);
			expect(res2).to.equal(null);
		});

		it('should not remove keys that dont match pattern', async () => {
			const key = '/api/transactions?123';
			const value = { testObject: 'testValue' };
			const pattern = '/api/delegate*';
			const result = await cache.setJsonForKey(key, value);
			expect(result).to.equal('OK');
			await cache.removeByPattern(pattern);
			const res = await cache.getJsonForKey(key);
			expect(res).to.eql(value);
		});

		it('should not remove any key when cache is not ready', async () => {
			const pattern = '/api/delegate*';

			cache.disable();
			try {
				await cache.removeByPattern(pattern);
			} catch (removeByPatternErr) {
				expect(removeByPatternErr.message).to.equal('Cache Disabled');
			}
		});
	});

	describe('flushDb', () => {
		it('should remove all keys from cache', async () => {
			const keys = ['test_key1', 'test_key2'];
			const dummyValue = {
				a: 'dummyValue',
			};

			const setPromises = keys.map(key => cache.setJsonForKey(key, dummyValue));
			const setResults = await Promise.all(setPromises);
			expect(setResults.filter(status => status !== 'OK')).to.have.length(0);

			const resultFlush = await cache.flushDb();
			expect(resultFlush).to.equal('OK');

			const getPromises = keys.map(key => cache.getJsonForKey(key));
			const getResults = await Promise.all(getPromises);
			expect(getResults.filter(status => status === null)).to.have.length(
				keys.length
			);
		});

		it('should not remove any key when cache is not ready', async () => {
			cache.disable();
			try {
				await cache.flushDb();
			} catch (flushDbErr) {
				expect(flushDbErr.message).to.equal('Cache Disabled');
			}
		});
	});

	describe('cleanup', () => {});

	describe('quit', () => {});
});
