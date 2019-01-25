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

const { CACHE } = global.constants;
const async = require('async');
const lisk = require('lisk-elements').default;
const componentsLoader = require('../../common/components_loader');
const accountFixtures = require('../../fixtures/accounts');
const randomUtil = require('../../common/utils/random');

describe('components: cache', () => {
	let cache;

	before(done => {
		__testContext.config.cacheEnabled = true;
		componentsLoader.initCache((err, __components) => {
			expect(err).to.not.exist;
			expect(__components).to.be.an('object');
			expect(__components).to.have.property('cache');
			cache = __components.cache;
			done();
		});
	});

	afterEach(done => {
		cache.flushDb((err, status) => {
			expect(err).to.not.exist;
			expect(status).to.equal('OK');
			done(err, status);
		});
	});

	after(done => {
		cache.quit(done);
	});

	describe('connect', () => {});

	describe('_onConnectionError', () => {});

	describe('_onReady', () => {});

	describe('isConnected', () => {});

	describe('isReady', () => {});

	describe('setJsonForKey', () => {
		it('should set the key value correctly', done => {
			const key = 'test_key';
			const value = { testObject: 'testValue' };

			cache.setJsonForKey(key, value, (err, status) => {
				expect(err).to.not.exist;
				expect(status).to.equal('OK');
				cache.getJsonForKey(key, (getJsonForKeyErr, res) => {
					expect(getJsonForKeyErr).to.not.exist;
					expect(res).to.eql(value);
					done(err, value);
				});
			});
		});
	});

	describe('getJsonForKey', () => {
		it('should return null for non-existent key', done => {
			const key = 'test_key';

			cache.getJsonForKey(key, (err, value) => {
				expect(err).to.not.exist;
				expect(value).to.equal(null);
				done(err, value);
			});
		});

		it('should get the correct value for the key', done => {
			const key = 'test_key';
			const value = { testObject: 'testValue' };

			cache.setJsonForKey(key, value, (err, status) => {
				expect(err).to.not.exist;
				expect(status).to.equal('OK');
				cache.getJsonForKey(key, (getJsonForKeyErrErr, res) => {
					expect(getJsonForKeyErrErr).to.not.exist;
					expect(res).to.eql(value);
					done(err, value);
				});
			});
		});
	});

	describe('removeByPattern', () => {
		it('should remove keys matching the pattern', done => {
			const key = '/api/transactions?123';
			const value = { testObject: 'testValue' };
			const pattern = '/api/transactions*';

			cache.setJsonForKey(key, value, (err, status) => {
				expect(err).to.not.exist;
				expect(status).to.equal('OK');
				cache.removeByPattern(pattern, removeByPatternErr => {
					expect(removeByPatternErr).to.not.exist;
					cache.getJsonForKey(key, (getJsonForKeyErr, res) => {
						expect(getJsonForKeyErr).to.not.exist;
						expect(res).to.equal(null);
						done();
					});
				});
			});
		});

		it('should not remove keys that dont match pattern', done => {
			const key = '/api/transactions?123';
			const value = { testObject: 'testValue' };
			const pattern = '/api/delegate*';

			cache.setJsonForKey(key, value, (err, status) => {
				expect(err).to.not.exist;
				expect(status).to.equal('OK');
				cache.removeByPattern(pattern, removeByPatternErr => {
					expect(removeByPatternErr).to.not.exist;
					cache.getJsonForKey(key, (getJsonForKeyErr, res) => {
						expect(getJsonForKeyErr).to.not.exist;
						expect(res).to.eql(value);
						done();
					});
				});
			});
		});
	});

	describe('flushDb', () => {
		it('should remove all keys from cache', done => {
			const key1 = 'test_key1';
			const key2 = 'test_key2';
			const dummyValue = {
				a: 'dummyValue',
			};
			async.series(
				[
					// save new entries in cache
					function(callback) {
						async.map(
							[key1, key2],
							(key, cb) => {
								cache.setJsonForKey(key, dummyValue, cb);
							},
							(err, result) => {
								expect(err).to.not.exist;
								expect(result).to.be.an('array');
								return callback(err, result);
							}
						);
					},
					// flush cache database
					function(callback) {
						cache.flushDb((err, status) => {
							expect(err).to.not.exist;
							expect(status).to.equal('OK');
							return callback(err, status);
						});
					},
					// check if entries exist
					function(callback) {
						async.map(
							[key1, key2],
							(key, cb) => {
								cache.getJsonForKey(key, cb);
							},
							(err, result) => {
								expect(err).to.not.exist;
								expect(result).to.be.an('array');
								expect(result).to.have.length(2);
								result.forEach(value => {
									expect(value).to.eql(null);
								});
								return callback(err, result);
							}
						);
					},
				],
				err => {
					done(err);
				}
			);
		});
	});

	describe('cleanup', () => {});

	describe('quit', () => {});

	describe('clearCacheFor', () => {
		it('should remove all keys matching pattern /api/transactions', done => {
			const key = '/api/transactions?123';
			const value = { testObject: 'testValue' };
			cache.setJsonForKey(key, value, (err, status) => {
				expect(err).to.not.exist;
				expect(status).to.equal('OK');
				cache.clearCacheFor('/api/transactions*', clearCacheForErr => {
					expect(clearCacheForErr).to.not.exist;
					cache.getJsonForKey(key, (getJsonForKeyErr, res) => {
						expect(getJsonForKeyErr).to.not.exist;
						expect(res).to.equal(null);
						done();
					});
				});
			});
		});

		it('should remove all keys matching pattern /api/blocks', done => {
			const key = '/api/blocks';
			const value = { testObject: 'testValue' };

			cache.setJsonForKey(key, value, (err, status) => {
				expect(err).to.not.exist;
				expect(status).to.equal('OK');

				cache.clearCacheFor('/api/blocks*', clearCacheForErr => {
					expect(clearCacheForErr).to.not.exist;
					cache.getJsonForKey(key, (getJsonForKeyErr, res) => {
						expect(getJsonForKeyErr).to.not.exist;
						expect(res).to.equal(null);
						done();
					});
				});
			});
		});

		it('should not remove keys that dont match pattern /api/blocks', done => {
			const key = '/api/delegates';
			const value = { testObject: 'testValue' };

			cache.setJsonForKey(key, value, (err, status) => {
				expect(err).to.not.exist;
				expect(status).to.equal('OK');

				cache.clearCacheFor('/api/blocks*', clearCacheForErr => {
					expect(clearCacheForErr).to.not.exist;
					cache.getJsonForKey(key, (getJsonForKeyErr, res) => {
						expect(getJsonForKeyErr).to.not.exist;
						expect(res).to.eql(value);
						done();
					});
				});
			});
		});

		it('should not remove keys when cacheReady = false', done => {
			const key = '/api/transactions';
			const value = { testObject: 'testValue' };

			cache.setJsonForKey(key, value, (err, status) => {
				expect(err).to.not.exist;
				expect(status).to.equal('OK');

				cache.onSyncStarted();
				cache.clearCacheFor('/api/transactions*', clearCacheForErr => {
					expect(clearCacheForErr).to.equal('Cache Disabled');
					cache.onSyncFinished();
					cache.getJsonForKey(key, (getJsonForKeyErr, res) => {
						expect(getJsonForKeyErr).to.not.exist;
						expect(res).to.eql(value);
						done();
					});
				});
			});
		});
	});

	describe('onFinishRound', () => {
		it('should remove all keys matching pattern /api/delegates', done => {
			const key = '/api/delegates?123';
			const value = { testObject: 'testValue' };

			cache.setJsonForKey(key, value, (err, status) => {
				expect(err).to.not.exist;
				expect(status).to.equal('OK');
				cache.onFinishRound(null, onFinishRoundErr => {
					expect(onFinishRoundErr).to.not.exist;
					cache.getJsonForKey(key, (getJsonForKeyErr, res) => {
						expect(getJsonForKeyErr).to.not.exist;
						expect(res).to.equal(null);
						done();
					});
				});
			});
		});

		it('should not remove keys that dont match pattern /api/delegates', done => {
			const key = '/api/blocks';
			const value = { testObject: 'testValue' };

			cache.setJsonForKey(key, value, (err, status) => {
				expect(err).to.not.exist;
				expect(status).to.equal('OK');

				cache.onFinishRound(null, onFinishRoundErr => {
					expect(onFinishRoundErr).to.not.exist;
					cache.getJsonForKey(key, (getJsonForKeyErr, res) => {
						expect(getJsonForKeyErr).to.not.exist;
						expect(res).to.eql(value);
						done();
					});
				});
			});
		});

		it('should not remove keys when cacheReady = false', done => {
			const key = '/api/delegates';
			const value = { testObject: 'testValue' };

			cache.setJsonForKey(key, value, (err, status) => {
				expect(err).to.not.exist;
				expect(status).to.equal('OK');

				cache.onSyncStarted();
				cache.onFinishRound(null, onFinishRoundErr => {
					expect(onFinishRoundErr).to.equal('Cache Disabled');
					cache.onSyncFinished();
					cache.getJsonForKey(key, (getJsonForKeyErr, res) => {
						expect(getJsonForKeyErr).to.not.exist;
						expect(res).to.eql(value);
						done();
					});
				});
			});
		});
	});

	describe('onTransactionsSaved', () => {
		it('shouldnt remove keys with pattern /api/delegate if there is no type 2 transaction', done => {
			const key = '/api/delegates?123';
			const value = { testObject: 'testValue' };

			cache.setJsonForKey(key, value, (err, status) => {
				expect(err).to.not.exist;
				expect(status).to.equal('OK');
				const transaction = lisk.transaction.transfer({
					amount: 1,
					passphrase: accountFixtures.genesis.passphrase,
					secondPassphrase: accountFixtures.genesis.secondPassphrase,
					recipientId: '1L',
				});

				cache.onTransactionsSaved([transaction], () => {
					cache.getJsonForKey(key, (getJsonForKeyErr, res) => {
						expect(getJsonForKeyErr).to.not.exist;
						expect(res).to.eql(value);
						done();
					});
				});
			});
		});

		it('should remove keys that match pattern /api/delegate on type 2 transaction', done => {
			const key = '/api/delegates?123';
			const value = { testObject: 'testValue' };

			cache.setJsonForKey(key, value, (err, status) => {
				expect(err).to.not.exist;
				expect(status).to.equal('OK');
				const transaction = lisk.transaction.registerDelegate({
					passphrase: randomUtil.password(),
					username: randomUtil.delegateName().toLowerCase(),
				});

				cache.onTransactionsSaved([transaction], () => {
					cache.getJsonForKey(key, (getJsonForKeyErr, res) => {
						expect(getJsonForKeyErr).to.not.exist;
						expect(res).to.equal(null);
						done();
					});
				});
			});
		});

		it('should remove keys "transactionCount" if there is any transaction saved', done => {
			const key = CACHE.KEYS.transactionCount;

			const value = { confirmed: 34 };

			cache.setJsonForKey(key, value, (err, status) => {
				expect(err).to.not.exist;
				expect(status).to.equal('OK');

				const transaction = lisk.transaction.registerDelegate({
					passphrase: randomUtil.password(),
					username: randomUtil.delegateName().toLowerCase(),
				});

				cache.onTransactionsSaved([transaction], () => {
					cache.getJsonForKey(key, (getJsonForKeyErr, res) => {
						expect(getJsonForKeyErr).to.not.exist;
						expect(res).to.equal(null);
						done();
					});
				});
			});
		});

		it('should not remove keys "transactionCount" if no transaction saved', done => {
			const key = CACHE.KEYS.transactionCount;
			const value = { confirmed: 34 };

			cache.setJsonForKey(key, value, (err, status) => {
				expect(err).to.not.exist;
				expect(status).to.equal('OK');

				cache.onTransactionsSaved([], () => {
					cache.getJsonForKey(key, (getJsonForKeyErr, res) => {
						expect(getJsonForKeyErr).to.not.exist;
						expect(res).to.eql(value);
						done();
					});
				});
			});
		});

		it('should not remove keys when cacheReady = false', done => {
			const key = '/api/delegates?123';
			const value = { testObject: 'testValue' };

			cache.setJsonForKey(key, value, (err, status) => {
				expect(err).to.not.exist;
				expect(status).to.equal('OK');
				const transaction = lisk.transaction.registerDelegate({
					passphrase: randomUtil.password(),
					username: randomUtil.delegateName().toLowerCase(),
				});

				cache.onSyncStarted();
				cache.onTransactionsSaved([transaction], onTransactionsSavedErr => {
					expect(onTransactionsSavedErr).to.equal('Cache Disabled');
					cache.onSyncFinished();
					cache.getJsonForKey(key, (getJsonForKeyErr, res) => {
						expect(getJsonForKeyErr).to.not.exist;
						expect(res).to.eql(value);
						done();
					});
				});
			});
		});
	});

	describe('onSyncStarted', () => {});

	describe('onSyncFinished', () => {});
});
