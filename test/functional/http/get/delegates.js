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
var lisk = require('lisk-js');
var Promise = require('bluebird');

var genesisDelegates = require('../../../data/genesis_delegates.json');
var accountFixtures = require('../../../fixtures/accounts');

var constants = require('../../../../helpers/constants');

var randomUtil = require('../../../common/utils/random');
var waitFor = require('../../../common/utils/wait_for');
Promise.promisify(waitFor.newRound);
var swaggerEndpoint = require('../../../common/swagger_spec');
var apiHelpers = require('../../../common/helpers/api');
var expectSwaggerParamError = apiHelpers.expectSwaggerParamError;

describe('GET /delegates', () => {
	var delegatesEndpoint = new swaggerEndpoint('GET /delegates');
	var validDelegate = genesisDelegates.delegates[0];
	var validNotExistingPublicKey = 'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca8';

	describe('/', () => {
		it('using no params should return genesis delegates with default limit', () => delegatesEndpoint.makeRequest({}, 200).then(res => {
				expect(res.body.data).to.have.lengthOf(10);
			}));

		it('using no params but with higher limit should return at least 101 genesis delegates', () => {
			var data = [];

			return delegatesEndpoint.makeRequest({ limit: 100 }, 200).then(res => {
				data = res.body.data;

				return delegatesEndpoint.makeRequest({ offset: 100, limit: 100 }, 200);
			}).then(res => {
				data.push(...res.body.data);

				expect(data).to.have.lengthOf.at.least(101);
			});
		});

		describe('publicKey', () => {
			it('using no publicKey should return an empty array', () => delegatesEndpoint.makeRequest({ publicKey: '' }, 200).then(res => {
					expect(res.body.data).to.be.empty;
				}));

			it('using invalid publicKey should fail', () => delegatesEndpoint.makeRequest({ publicKey: 'invalidPublicKey' }, 400).then(res => {
					expectSwaggerParamError(res, 'publicKey');
				}));

			it('using valid existing publicKey of genesis delegate should return the result', () => delegatesEndpoint.makeRequest({ publicKey: validDelegate.publicKey }, 200).then(res => {
					expect(res.body.data).to.have.length(1);
					expect(res.body.data[0].account.publicKey).to.be.eql(validDelegate.publicKey);
				}));

			it('using valid not existing publicKey should return an empty array', () => delegatesEndpoint.makeRequest({ publicKey: validNotExistingPublicKey }, 200).then(res => {
					expect(res.body.data).to.be.empty;
				}));
		});

		describe('secondPublicKey', () => {
			var secondSecretAccount = randomUtil.account();

			var creditTransaction = lisk.transaction.createTransaction(secondSecretAccount.address, constants.fees.secondSignature + constants.fees.delegate, accountFixtures.genesis.password);
			var signatureTransaction = lisk.signature.createSignature(secondSecretAccount.password, secondSecretAccount.secondPassword);
			var delegateTransaction = lisk.delegate.createDelegate(secondSecretAccount.password, secondSecretAccount.username);

			before(() => apiHelpers.sendTransactionPromise(creditTransaction).then(res => {
					expect(res.statusCode).to.be.eql(200);
					return waitFor.confirmations([creditTransaction.id]);
				}).then(() => apiHelpers.sendTransactionsPromise([signatureTransaction, delegateTransaction])).then(res => {
					expect(res[0].statusCode).to.be.eql(200);
					expect(res[1].statusCode).to.be.eql(200);
					return waitFor.confirmations([signatureTransaction.id, delegateTransaction.id]);
				}));

			it.only('using no secondPublicKey should return an empty array', () => delegatesEndpoint.makeRequest({ secondPublicKey: '' }, 200).then(res => {
					expect(res.body.data).to.be.empty;
				}));

			it('using invalid secondPublicKey should fail', () => delegatesEndpoint.makeRequest({ secondPublicKey: 'invalidAddress' }, 400).then(res => {
					expectSwaggerParamError(res, 'secondPublicKey');
				}));

			it('using valid existing secondPublicKey of delegate should return the result', () => delegatesEndpoint.makeRequest({ secondPublicKey: secondSecretAccount.secondPublicKey }, 200).then(res => {
					expect(res.body.data).to.have.length(1);
					expect(res.body.data[0].account.secondPublicKey).to.be.eql(secondSecretAccount.secondPublicKey);
				}));

			it('using valid not existing secondPublicKey should return an empty array', () => delegatesEndpoint.makeRequest({ secondPublicKey: validNotExistingPublicKey }, 200).then(res => {
					expect(res.body.data).to.be.empty;
				}));
		});

		describe('address', () => {
			it('using no address should return a schema error', () => delegatesEndpoint.makeRequest({ address: '' }, 400).then(res => {
					expectSwaggerParamError(res, 'address');
				}));

			it('using invalid address should fail', () => delegatesEndpoint.makeRequest({ address: 'invalidAddress' }, 400).then(res => {
					expectSwaggerParamError(res, 'address');
				}));

			it('using valid existing address of genesis delegate should return the result', () => delegatesEndpoint.makeRequest({ address: validDelegate.address }, 200).then(res => {
					expect(res.body.data[0].account.address).to.eql(validDelegate.address);
				}));

			it('using valid not existing address should return an empty array', () => delegatesEndpoint.makeRequest({ address: '1111111111111111111L' }, 200).then(res => {
					expect(res.body.data).to.be.empty;
				}));
		});

		describe('username', () => {
			it('using no username should return a schema error', () => delegatesEndpoint.makeRequest({ username: '' }, 400).then(res => {
					expectSwaggerParamError(res, 'username');
				}));

			it('using integer username should be ok', () => delegatesEndpoint.makeRequest({ username: 1 }, 200));

			it('using valid existing username of genesis delegate should return the result', () => delegatesEndpoint.makeRequest({ username: validDelegate.username }, 200).then(res => {
					expect(res.body.data[0].username).to.eql(validDelegate.username);
				}));

			it('using valid not existing username should return an empty array', () => delegatesEndpoint.makeRequest({ username: 'unknownusername' }, 200).then(res => {
					expect(res.body.data).to.be.empty;
				}));
		});

		describe('search', () => {
			it('using blank search should fail', () => delegatesEndpoint.makeRequest({ search: '' }, 400).then(res => {
					expectSwaggerParamError(res, 'search');
				}));

			it('using the special match all character should return all results', () => delegatesEndpoint.makeRequest({ search: '%' }, 200).then(res => {
					expect(res.body.data).to.have.length.of.at.least(10);
				}));

			it('using valid search with length=1 should be ok', () => delegatesEndpoint.makeRequest({ search: 'g' }, 200));

			it('using search with length=20 should be ok', () => delegatesEndpoint.makeRequest({ search: 'genesis_123456789012' }, 200));

			it('using search with length > 20 should fail', () => delegatesEndpoint.makeRequest({ search: 'genesis_1234567890123' }, 400).then(res => {
					expectSwaggerParamError(res, 'search');
				}));

			it('using search="genesis_1" should return 13 delegates', () => delegatesEndpoint.makeRequest({ search: 'genesis_1', limit: 20 }, 200).then(res => {
					expect(res.body.data).to.have.length(13);
					res.body.data.map(d => { expect(/^genesis_1.*/.test(d.username)).to.be.true; });
				}));

			it('using search="genesis_10" should return 3 delegates', () => delegatesEndpoint.makeRequest({ search: 'genesis_10' }, 200).then(res => {
					expect(res.body.data).to.have.length(3);
					res.body.data.map(d => { expect(/^genesis_10.*/.test(d.username)).to.be.true; });
				}));

			it('using search="genesis_101" should return 1 delegate', () => delegatesEndpoint.makeRequest({ search: 'genesis_101' }, 200).then(res => {
					expect(res.body.data).to.have.length(1);
					expect(res.body.data[0].username).to.eql('genesis_101');
				}));

			it('using higher limit should return 101 delegates', () => delegatesEndpoint.makeRequest({ search: 'genesis_', limit: 100 }, 200).then(res => {
					expect(res.body.data).to.have.length(100);
					res.body.data.map(d => { expect(/^genesis_.*/.test(d.username)).to.be.true; });
				}));
		});

		describe('sort', () => {
			it('using sort="unknown:asc" should not sort results', () => delegatesEndpoint.makeRequest({ sort: '' }, 400).then(res => {
					expectSwaggerParamError(res, 'sort');
				}));

			it('using sort="rank:asc" should sort results in ascending order', () => delegatesEndpoint.makeRequest({ sort: 'rank:asc' }, 200).then(res => {
					expect(_.map(res.data, 'rank').sort()).to.eql(_.map(res.data, 'rank'));
				}));

			it('using sort="rank:desc" should sort results in descending order', () => delegatesEndpoint.makeRequest({ sort: 'rank:asc' }, 200).then(res => {
					expect(_.map(res.data, 'rank').sort().reverse()).to.eql(_.map(res.data, 'rank'));
				}));

			it('using sort="username:asc" should sort results in ascending order', () => delegatesEndpoint.makeRequest({ sort: 'username:asc' }, 200).then(res => {
					expect(_(res.data).map('username').dbSort()).to.eql(_.map(res.data, 'username'));
				}));

			it('using sort="username:desc" should sort results in descending order', () => delegatesEndpoint.makeRequest({ sort: 'username:desc' }, 200).then(res => {
					expect(_(res.data).map('username').dbSort('desc')).to.eql(_.map(res.data, 'username'));
				}));

			it('using sort="missedBlocks:asc" should sort results in ascending order', () => delegatesEndpoint.makeRequest({ sort: 'missedBlocks:asc' }, 200).then(res => {
					expect(_.map(res.data, 'missedBlocks').sort()).to.eql(_.map(res.data, 'missedBlocks'));
				}));

			it('using sort="missedBlocks:desc" should sort results in descending order', () => delegatesEndpoint.makeRequest({ sort: 'missedBlocks:desc' }, 200).then(res => {
					expect(_.map(res.data, 'missedBlocks').sort().reverse()).to.eql(_.map(res.data, 'missedBlocks'));
				}));

			it('using sort="productivity:asc" should sort results in ascending order', () => delegatesEndpoint.makeRequest({ sort: 'productivity:asc' }, 200).then(res => {
					expect(_.map(res.data, 'productivity').sort()).to.eql(_.map(res.data, 'productivity'));
				}));

			it('using sort="productivity:desc" should sort results in descending order', () => delegatesEndpoint.makeRequest({ sort: 'productivity:desc' }, 200).then(res => {
					expect(_.map(res.data, 'productivity').sort().reverse()).to.eql(_.map(res.data, 'productivity'));
				}));

			it('using sort with any of sort fields should not place NULLs first', () => {
				var delegatesSortFields = ['rank', 'username', 'missedBlocks', 'productivity'];
				return Promise.all(delegatesSortFields.map(sortField => delegatesEndpoint.makeRequest({ sort: `${sortField}:asc` }, 200).then(res => {
						_(_.map(res.data, sortField)).appearsInLast(null);
					})));
			});
		});

		describe('limit', () => {
			it('using string limit should fail', () => delegatesEndpoint.makeRequest({ limit: 'one' }, 400).then(res => {
					expectSwaggerParamError(res, 'limit');
				}));

			it('using limit=-1 should fail', () => delegatesEndpoint.makeRequest({ limit: -1 }, 400).then(res => {
					expectSwaggerParamError(res, 'limit');
				}));

			it('using limit=0 should fail', () => delegatesEndpoint.makeRequest({ limit: 0 }, 400).then(res => {
					expectSwaggerParamError(res, 'limit');
				}));

			it('using limit=1 should be ok', () => delegatesEndpoint.makeRequest({ limit: 1 }, 200).then(res => {
					expect(res.body.data).to.have.length(1);
				}));

			it('using limit=101 should be ok', () => delegatesEndpoint.makeRequest({ limit: 100 }, 200).then(res => {
					expect(res.body.data).to.have.length(100);
				}));

			it('using limit > 100 should fail', () => delegatesEndpoint.makeRequest({ limit: 101 }, 400).then(res => {
					expectSwaggerParamError(res, 'limit');
				}));
		});

		describe('offset', () => {
			it('using string offset should fail', () => delegatesEndpoint.makeRequest({ offset: 'one' }, 400).then(res => {
					expectSwaggerParamError(res, 'offset');
				}));

			it('using offset=1 should be ok', () => delegatesEndpoint.makeRequest({ offset: 1, limit: 10 }, 200).then(res => {
					expect(res.body.data).to.have.lengthOf.at.least(10);
				}));

			it('using offset=-1 should fail', () => delegatesEndpoint.makeRequest({ offset: -1 }, 400).then(res => {
					expectSwaggerParamError(res, 'offset');
				}));
		});
	});

	describe('GET /forgers', () => {
		var forgersEndpoint = new swaggerEndpoint('GET /delegates/forgers');

		it('using no params should be ok', () => forgersEndpoint.makeRequest({}, 200).then(res => {
				expect(res.body.data).to.have.length(10);
			}));

		it('using limit=1 should be ok', () => forgersEndpoint.makeRequest({ limit: 1 }, 200).then(res => {
				expect(res.body.data).to.have.length(1);
			}));

		it('using offset=1 limit=10 should be ok', () => forgersEndpoint.makeRequest({ limit: 10, offset: 1 }, 200).then(res => {
				expect(res.body.data).to.have.length(10);
			}));

		describe('slot numbers are correct', () => {
			var forgersData;

			before(() => forgersEndpoint.makeRequest({}, 200).then(res => {
					forgersData = res.body;
				}));

			it('lastBlockSlot should be less or equal to currentSlot', () => {
				expect(forgersData.meta.lastBlockSlot).to.be.at.most(forgersData.meta.currentSlot);
			});

			it('every forger nextSlot should be greater than currentSlot', () => {
				forgersData.data.forEach(forger => {
					expect(forgersData.meta.currentSlot).to.be.at.most(forger.nextSlot);
				});
			});
		});
	});
});
