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

require('../../functional.js');
var Promise = require('bluebird');
var lisk = require('lisk-elements').default;
var accountFixtures = require('../../../fixtures/accounts');
var randomUtil = require('../../../common/utils/random');
var waitFor = require('../../../common/utils/wait_for');
var swaggerEndpoint = require('../../../common/swagger_spec');
var apiHelpers = require('../../../common/helpers/api');

const { NORMALIZER } = global.constants;
var expectSwaggerParamError = apiHelpers.expectSwaggerParamError;

describe('GET /dapps', () => {
	var dappsEndpoint = new swaggerEndpoint('GET /dapps');

	var transactionsToWaitFor = [];

	var account = randomUtil.account();
	var dapp1 = randomUtil.application();
	dapp1.category = 1;
	var dapp2 = randomUtil.application();
	dapp2.category = 2;
	var registeredDappsAmount = 2;

	before(() => {
		var transaction = lisk.transaction.transfer({
			amount: 1000 * NORMALIZER,
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: account.address,
		});
		transactionsToWaitFor.push(transaction.id);
		return apiHelpers
			.sendTransactionPromise(transaction)
			.then(res => {
				expect(res)
					.to.have.property('status')
					.to.equal(200);
				return waitFor.confirmations(transactionsToWaitFor);
			})
			.then(() => {
				transactionsToWaitFor = [];

				var transaction1 = lisk.transaction.createDapp({
					passphrase: account.passphrase,
					options: dapp1,
				});
				var transaction2 = lisk.transaction.createDapp({
					passphrase: account.passphrase,
					options: dapp2,
				});
				var promises = [];
				promises.push(apiHelpers.sendTransactionPromise(transaction1));
				promises.push(apiHelpers.sendTransactionPromise(transaction2));

				transactionsToWaitFor.push(transaction1.id, transaction2.id);
				return Promise.all(promises);
			})
			.then(results => {
				results.forEach(res => {
					expect(res)
						.to.have.property('status')
						.to.equal(200);
				});
				return waitFor.confirmations(transactionsToWaitFor);
			});
	});

	describe('/', () => {
		it('should return all results', () => {
			return dappsEndpoint.makeRequest({}, 200).then(res => {
				expect(res.body.data.length).to.be.at.least(registeredDappsAmount);
			});
		});
	});

	describe('?', () => {
		describe('transactionId=', () => {
			it('using empty string should return all results', () => {
				return dappsEndpoint
					.makeRequest({ transactionId: '' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'transactionId');
					});
			});

			it('using null should fail', () => {
				return dappsEndpoint
					.makeRequest({ transactionId: null }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'transactionId');
					});
			});

			it('using non-numeric id should fail', () => {
				return dappsEndpoint
					.makeRequest({ transactionId: 'ABCDEFGHIJKLMNOPQRST' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'transactionId');
					});
			});

			it('using id with length > 20 should fail', () => {
				return dappsEndpoint
					.makeRequest({ transactionId: '012345678901234567890' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'transactionId');
					});
			});

			it('using unknown id should return an empty array', () => {
				return dappsEndpoint
					.makeRequest({ transactionId: '8713095156789756398' }, 200)
					.then(res => {
						expect(res.body.data).to.be.empty;
					});
			});

			it('using known ids should be ok', () => {
				return Promise.map(transactionsToWaitFor, transaction => {
					return dappsEndpoint
						.makeRequest({ transactionId: transaction }, 200)
						.then(res => {
							expect(res.body.data[0].transactionId).to.be.eql(transaction);
						});
				});
			});
		});

		describe('name=', () => {
			it('using string with length < 1 should fail', () => {
				return dappsEndpoint.makeRequest({ name: '' }, 400).then(res => {
					expectSwaggerParamError(res, 'name');
				});
			});

			it('using string with length > 32 should fail', () => {
				return dappsEndpoint
					.makeRequest({ name: 'ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFG' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'name');
					});
			});

			it('using string = "Unknown" should be ok', () => {
				return dappsEndpoint.makeRequest({ name: 'Unknown' }, 200).then(res => {
					expect(res.body.data).to.be.empty;
				});
			});

			it('using registered dapp1 name should be ok', () => {
				return dappsEndpoint
					.makeRequest({ name: dapp1.name }, 200)
					.then(res => {
						expect(res.body.data).to.have.length(1);
						expect(res.body.data[0].name).to.be.eql(dapp1.name);
					});
			});

			it('using registered dapp2 name should be ok', () => {
				return dappsEndpoint
					.makeRequest({ name: dapp2.name }, 200)
					.then(res => {
						expect(res.body.data).to.have.length(1);
						expect(res.body.data[0].name).to.be.eql(dapp2.name);
					});
			});
		});

		describe('limit=', () => {
			it('using 0 should fail', () => {
				return dappsEndpoint.makeRequest({ limit: 0 }, 400).then(res => {
					expectSwaggerParamError(res, 'limit');
				});
			});

			it('using integer > 100 should fail', () => {
				return dappsEndpoint.makeRequest({ limit: 101 }, 400).then(res => {
					expectSwaggerParamError(res, 'limit');
				});
			});

			it('using 1 should be ok', () => {
				return dappsEndpoint.makeRequest({ limit: 1 }, 200).then(res => {
					expect(res.body.data).to.have.length(1);
				});
			});

			it('using 100 should be ok', () => {
				return dappsEndpoint.makeRequest({ limit: 100 }, 200).then(res => {
					expect(res.body.data).to.have.length.at.most(100);
				});
			});
		});

		describe('limit=1&', () => {
			it('using offset < 0 should fail', () => {
				return dappsEndpoint
					.makeRequest({ limit: 1, offset: -1 }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'offset');
					});
			});

			it('using offset 0 should be ok', () => {
				return dappsEndpoint
					.makeRequest({ limit: 1, offset: 0 }, 200)
					.then(res => {
						expect(res.body.data).to.have.length(1);
						expect(res.body.meta.limit).to.be.eql(1);
						expect(res.body.meta.offset).to.be.eql(0);
					});
			});

			it('using offset 1 should be ok', () => {
				return dappsEndpoint
					.makeRequest({ limit: 1, offset: 1 }, 200)
					.then(res => {
						expect(res.body.data).to.have.length(1);
						expect(res.body.meta.limit).to.be.eql(1);
						expect(res.body.meta.offset).to.be.eql(1);
					});
			});
		});

		describe('offset=', () => {
			it('using offset 0 should return different result than offset 1', () => {
				return dappsEndpoint
					.makeRequests([{ offset: 0 }, { offset: 1 }], 200)
					.then(responses => {
						expect(responses).to.have.length(2);
						expect(responses[0].body.data[0].name).to.not.equal(
							responses[1].body.data[0].name
						);
					});
			});
		});

		describe('sort=', () => {
			// Create 20 random applications to increase data set
			before(() => {
				var promises = [];
				var transaction;
				var transactionsToWaitFor = [];

				for (var i = 1; i <= 20; i++) {
					transaction = lisk.transaction.createDapp({
						passphrase: account.passphrase,
						options: randomUtil.application(),
					});
					transactionsToWaitFor.push(transaction.id);
					promises.push(apiHelpers.sendTransactionPromise(transaction));
				}

				return Promise.all(promises).then(results => {
					results.forEach(res => {
						expect(res)
							.to.have.property('status')
							.to.equal(200);
					});
					return waitFor.confirmations(transactionsToWaitFor);
				});
			});

			it('using "unknown:unknown" should fail', () => {
				return dappsEndpoint
					.makeRequest({ sort: 'unknown:unknown' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'sort');
					});
			});

			it('using "name:unknown" should fail', () => {
				return dappsEndpoint
					.makeRequest({ sort: 'name:unknown' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'sort');
					});
			});

			it('using "name:asc" should return result in descending order', () => {
				return dappsEndpoint
					.makeRequest({ sort: 'name:asc' }, 200)
					.then(res => {
						var obtainedArray = _.map(res.body.dapps, 'name');
						var cloneObtainedArray = _.clone(obtainedArray);
						var expectedArray = cloneObtainedArray.sort();

						expect(expectedArray).eql(obtainedArray);
					});
			});

			it('using "name:desc" should return result in descending order', () => {
				return dappsEndpoint
					.makeRequest({ sort: 'name:desc' }, 200)
					.then(res => {
						var obtainedArray = _.map(res.body.dapps, 'name');
						var cloneObtainedArray = _.clone(obtainedArray);
						var expectedArray = cloneObtainedArray.sort().reverse();

						expect(expectedArray).eql(obtainedArray);
					});
			});
		});

		describe('unknown=', () => {
			it('using empty string should return all results', () => {
				return dappsEndpoint.makeRequest({ unknown: '' }, 200).then(res => {
					expect(res.body.data).to.have.length.at.least(registeredDappsAmount);
				});
			});

			it('using "unknown" should return all results', () => {
				return dappsEndpoint
					.makeRequest({ unknown: 'unknown' }, 200)
					.then(res => {
						expect(res.body.data).to.have.length.at.least(
							registeredDappsAmount
						);
					});
			});
		});
	});
});
