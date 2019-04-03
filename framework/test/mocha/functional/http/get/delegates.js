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
const {
	transfer,
	registerSecondPassphrase,
	registerDelegate,
} = require('@liskhq/lisk-transactions');
const Bignum = require('bignumber.js');
const genesisDelegates = require('../../../data/genesis_delegates.json');
const accountFixtures = require('../../../fixtures/accounts');
const slots = require('../../../../../src/modules/chain/helpers/slots');
const randomUtil = require('../../../common/utils/random');
const waitFor = require('../../../common/utils/wait_for');
const SwaggerEndpoint = require('../../../common/swagger_spec');
const apiHelpers = require('../../../common/helpers/api');

Promise.promisify(waitFor.newRound);
const { FEES } = global.constants;
const expectSwaggerParamError = apiHelpers.expectSwaggerParamError;

describe('GET /delegates', () => {
	const delegatesEndpoint = new SwaggerEndpoint('GET /delegates');
	const validDelegate = genesisDelegates.delegates[0];
	const validNotExistingPublicKey =
		'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca8';

	describe('/', () => {
		it('using no params should return genesis delegates with default limit', async () => {
			return delegatesEndpoint.makeRequest({}, 200).then(res => {
				expect(res.body.data).to.have.lengthOf(10);
			});
		});

		it('using no params but with higher limit should return at least 101 genesis delegates', async () => {
			let data = [];

			return delegatesEndpoint
				.makeRequest({ limit: 101 }, 200)
				.then(res => {
					data = res.body.data;

					return delegatesEndpoint.makeRequest(
						{ offset: 101, limit: 101 },
						200
					);
				})
				.then(res => {
					data.push(...res.body.data);

					expect(data).to.have.lengthOf.at.least(101);
				});
		});

		describe('with wrong input', () => {
			it('using invalid field name should fail', async () => {
				return delegatesEndpoint
					.makeRequest(
						{
							whatever: accountFixtures.genesis.address,
						},
						400
					)
					.then(res => {
						expectSwaggerParamError(res, 'whatever');
					});
			});

			it('using completely invalid fields should fail', async () => {
				return delegatesEndpoint
					.makeRequest(
						{
							publicKey: 'invalid',
							limit: 'invalid',
							offset: 'invalid',
							sort: 'invalid',
						},
						400
					)
					.then(res => {
						expectSwaggerParamError(res, 'publicKey');
						expectSwaggerParamError(res, 'limit');
						expectSwaggerParamError(res, 'offset');
						expectSwaggerParamError(res, 'sort');
					});
			});

			it('using partially invalid fields should fail', async () => {
				return delegatesEndpoint
					.makeRequest(
						{
							publicKey: validDelegate.publicKey,
							limit: 'invalid',
							offset: 'invalid',
							sort: 'invalid',
						},
						400
					)
					.then(res => {
						expectSwaggerParamError(res, 'limit');
						expectSwaggerParamError(res, 'offset');
						expectSwaggerParamError(res, 'sort');
					});
			});
		});

		describe('publicKey', () => {
			it('using no publicKey should return an empty array', async () => {
				return delegatesEndpoint
					.makeRequest({ publicKey: '' }, 200)
					.then(res => {
						expect(res.body.data).to.be.empty;
					});
			});

			it('using invalid publicKey should fail', async () => {
				return delegatesEndpoint
					.makeRequest({ publicKey: 'invalidPublicKey' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'publicKey');
					});
			});

			it('using valid existing publicKey of genesis delegate should return the result', async () => {
				return delegatesEndpoint
					.makeRequest({ publicKey: validDelegate.publicKey }, 200)
					.then(res => {
						expect(res.body.data).to.have.length(1);
						expect(res.body.data[0].account.publicKey).to.be.eql(
							validDelegate.publicKey
						);
					});
			});

			it('using valid not existing publicKey should return an empty array', async () => {
				return delegatesEndpoint
					.makeRequest({ publicKey: validNotExistingPublicKey }, 200)
					.then(res => {
						expect(res.body.data).to.be.empty;
					});
			});
		});

		describe('secondPublicKey', () => {
			const secondPassphraseAccount = randomUtil.account();

			const creditTransaction = transfer({
				amount: new Bignum(FEES.SECOND_SIGNATURE)
					.plus(FEES.DELEGATE)
					.toString(),
				passphrase: accountFixtures.genesis.passphrase,
				recipientId: secondPassphraseAccount.address,
			});
			const signatureTransaction = registerSecondPassphrase({
				passphrase: secondPassphraseAccount.passphrase,
				secondPassphrase: secondPassphraseAccount.secondPassphrase,
			});
			const delegateTransaction = registerDelegate({
				passphrase: secondPassphraseAccount.passphrase,
				username: secondPassphraseAccount.username,
			});

			before(() => {
				return apiHelpers
					.sendTransactionPromise(creditTransaction)
					.then(res => {
						expect(res.statusCode).to.be.eql(200);
						return waitFor.confirmations([creditTransaction.id]);
					})
					.then(() => {
						return apiHelpers.sendTransactionsPromise([
							signatureTransaction,
							delegateTransaction,
						]);
					})
					.then(res => {
						expect(res[0].statusCode).to.be.eql(200);
						expect(res[1].statusCode).to.be.eql(200);
						return waitFor.confirmations([
							signatureTransaction.id,
							delegateTransaction.id,
						]);
					});
			});

			it('using no secondPublicKey should return an empty array', async () => {
				return delegatesEndpoint
					.makeRequest({ secondPublicKey: '' }, 200)
					.then(res => {
						expect(res.body.data).to.be.empty;
					});
			});

			it('using invalid secondPublicKey should fail', async () => {
				return delegatesEndpoint
					.makeRequest({ secondPublicKey: 'invalidAddress' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'secondPublicKey');
					});
			});

			it('using valid existing secondPublicKey of delegate should return the result', async () => {
				return delegatesEndpoint
					.makeRequest(
						{ secondPublicKey: secondPassphraseAccount.secondPublicKey },
						200
					)
					.then(res => {
						expect(res.body.data).to.have.length(1);
						expect(res.body.data[0].account.secondPublicKey).to.be.eql(
							secondPassphraseAccount.secondPublicKey
						);
					});
			});

			it('using valid not existing secondPublicKey should return an empty array', async () => {
				return delegatesEndpoint
					.makeRequest({ secondPublicKey: validNotExistingPublicKey }, 200)
					.then(res => {
						expect(res.body.data).to.be.empty;
					});
			});
		});

		describe('address', () => {
			it('using no address should return a schema error', async () => {
				return delegatesEndpoint.makeRequest({ address: '' }, 400).then(res => {
					expectSwaggerParamError(res, 'address');
				});
			});

			it('using invalid address should fail', async () => {
				return delegatesEndpoint
					.makeRequest({ address: 'invalidAddress' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'address');
					});
			});

			it('using valid existing address of genesis delegate should return the result', async () => {
				return delegatesEndpoint
					.makeRequest({ address: validDelegate.address }, 200)
					.then(res => {
						expect(res.body.data[0].account.address).to.eql(
							validDelegate.address
						);
					});
			});

			it('using valid not existing address should return an empty array', async () => {
				return delegatesEndpoint
					.makeRequest({ address: '1111111111111111111L' }, 200)
					.then(res => {
						expect(res.body.data).to.be.empty;
					});
			});
		});

		describe('username', () => {
			it('using no username should return a schema error', async () => {
				return delegatesEndpoint
					.makeRequest({ username: '' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'username');
					});
			});

			it('using integer username should be ok', async () => {
				return delegatesEndpoint.makeRequest({ username: 1 }, 200);
			});

			it('using valid existing username of genesis delegate should return the result', async () => {
				return delegatesEndpoint
					.makeRequest({ username: validDelegate.username }, 200)
					.then(res => {
						expect(res.body.data[0].username).to.eql(validDelegate.username);
					});
			});

			it('using valid not existing username should return an empty array', async () => {
				return delegatesEndpoint
					.makeRequest({ username: 'unknownusername' }, 200)
					.then(res => {
						expect(res.body.data).to.be.empty;
					});
			});
		});

		describe('search', () => {
			it('using blank search should fail', async () => {
				return delegatesEndpoint.makeRequest({ search: '' }, 400).then(res => {
					expectSwaggerParamError(res, 'search');
				});
			});

			it('using the special match all character should return all results', async () => {
				return delegatesEndpoint.makeRequest({ search: '%' }, 200).then(res => {
					expect(res.body.data).to.have.length.of.at.least(10);
				});
			});

			it('using unknown numeric string should be ok', async () => {
				return delegatesEndpoint
					.makeRequest(
						{
							search: accountFixtures.genesis.address.slice(
								0,
								accountFixtures.genesis.address.length - 1
							),
						},
						200
					)
					.then(res => {
						expect(res.body.data).to.have.length.at.least(0);
					});
			});

			it('using existing numeric string should be ok', async () => {
				return delegatesEndpoint
					.makeRequest(
						{
							search: 99,
						},
						200
					)
					.then(res => {
						expect(res.body.data).to.have.length.at.least(1);
						res.body.data.map(d => {
							return expect(/99/.test(d.username)).to.be.true;
						});
					});
			});

			it('using valid search with length=1 should be ok', async () => {
				return delegatesEndpoint.makeRequest({ search: 'g' }, 200);
			});

			it('using search with length=20 should be ok', async () => {
				return delegatesEndpoint.makeRequest(
					{ search: 'genesis_123456789012' },
					200
				);
			});

			it('using search with length > 20 should fail', async () => {
				return delegatesEndpoint
					.makeRequest({ search: 'genesis_1234567890123' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'search');
					});
			});

			it('using search="genesis_1" should return 13 delegates', async () => {
				return delegatesEndpoint
					.makeRequest({ search: 'genesis_1', limit: 20 }, 200)
					.then(res => {
						expect(res.body.data).to.have.length(13);
						res.body.data.map(d => {
							return expect(/^genesis_1.*/.test(d.username)).to.be.true;
						});
					});
			});

			it('using search="genesis_10" should return 3 delegates', async () => {
				return delegatesEndpoint
					.makeRequest({ search: 'genesis_10' }, 200)
					.then(res => {
						expect(res.body.data).to.have.length(3);
						res.body.data.map(d => {
							return expect(/^genesis_10.*/.test(d.username)).to.be.true;
						});
					});
			});

			it('using search="genesis_101" should return 1 delegate', async () => {
				return delegatesEndpoint
					.makeRequest({ search: 'genesis_101' }, 200)
					.then(res => {
						expect(res.body.data).to.have.length(1);
						expect(res.body.data[0].username).to.eql('genesis_101');
					});
			});

			it('using higher limit should return 101 delegates', async () => {
				return delegatesEndpoint
					.makeRequest({ search: 'genesis_', limit: 101 }, 200)
					.then(res => {
						expect(res.body.data).to.have.length(101);
						res.body.data.map(d => {
							return expect(/^genesis_.*/.test(d.username)).to.be.true;
						});
					});
			});
		});

		describe('sort', () => {
			it('using sort="unknown:asc" should not sort results', async () => {
				return delegatesEndpoint.makeRequest({ sort: '' }, 400).then(res => {
					expectSwaggerParamError(res, 'sort');
				});
			});

			it('using sort="rank:asc" should sort results in ascending order', async () => {
				return delegatesEndpoint
					.makeRequest({ sort: 'rank:asc' }, 200)
					.then(res => {
						expect(_.map(res.data, 'rank').sort()).to.eql(
							_.map(res.data, 'rank')
						);
					});
			});

			it('using sort="rank:desc" should sort results in descending order', async () => {
				return delegatesEndpoint
					.makeRequest({ sort: 'rank:asc' }, 200)
					.then(res => {
						expect(
							_.map(res.data, 'rank')
								.sort()
								.reverse()
						).to.eql(_.map(res.data, 'rank'));
					});
			});

			it('using sort="username:asc" should sort results in ascending order', async () => {
				return delegatesEndpoint
					.makeRequest({ sort: 'username:asc' }, 200)
					.then(res => {
						expect(
							_(res.data)
								.map('username')
								.dbSort()
						).to.eql(_.map(res.data, 'username'));
					});
			});

			it('using sort="username:desc" should sort results in descending order', async () => {
				return delegatesEndpoint
					.makeRequest({ sort: 'username:desc' }, 200)
					.then(res => {
						expect(
							_(res.data)
								.map('username')
								.dbSort('desc')
						).to.eql(_.map(res.data, 'username'));
					});
			});

			it('using sort="missedBlocks:asc" should sort results in ascending order', async () => {
				return delegatesEndpoint
					.makeRequest({ sort: 'missedBlocks:asc' }, 200)
					.then(res => {
						expect(_.map(res.data, 'missedBlocks').sort()).to.eql(
							_.map(res.data, 'missedBlocks')
						);
					});
			});

			it('using sort="missedBlocks:desc" should sort results in descending order', async () => {
				return delegatesEndpoint
					.makeRequest({ sort: 'missedBlocks:desc' }, 200)
					.then(res => {
						expect(
							_.map(res.data, 'missedBlocks')
								.sort()
								.reverse()
						).to.eql(_.map(res.data, 'missedBlocks'));
					});
			});

			it('using sort="producedBlocks:asc" should sort results in ascending order', async () => {
				return delegatesEndpoint
					.makeRequest({ sort: 'producedBlocks:asc' }, 200)
					.then(res => {
						expect(_.map(res.data, 'producedBlocks').sort()).to.eql(
							_.map(res.data, 'producedBlocks')
						);
					});
			});

			it('using sort="producedBlocks:desc" should sort results in descending order', async () => {
				return delegatesEndpoint
					.makeRequest({ sort: 'producedBlocks:desc' }, 200)
					.then(res => {
						expect(
							_.map(res.data, 'producedBlocks')
								.sort()
								.reverse()
						).to.eql(_.map(res.data, 'producedBlocks'));
					});
			});

			it('using sort="productivity:asc" should sort results in ascending order', async () => {
				return delegatesEndpoint
					.makeRequest({ sort: 'productivity:asc' }, 200)
					.then(res => {
						expect(_.map(res.data, 'productivity').sort()).to.eql(
							_.map(res.data, 'productivity')
						);
					});
			});

			it('using sort="productivity:desc" should sort results in descending order', async () => {
				return delegatesEndpoint
					.makeRequest({ sort: 'productivity:desc' }, 200)
					.then(res => {
						expect(
							_.map(res.data, 'productivity')
								.sort()
								.reverse()
						).to.eql(_.map(res.data, 'productivity'));
					});
			});

			it('using sort with any of sort fields should not place NULLs first', async () => {
				const delegatesSortFields = [
					'rank',
					'username',
					'missedBlocks',
					'productivity',
				];
				return Promise.all(
					delegatesSortFields.map(sortField => {
						return delegatesEndpoint
							.makeRequest({ sort: `${sortField}:asc` }, 200)
							.then(res => {
								_(_.map(res.data, sortField)).appearsInLast(null);
							});
					})
				);
			});
		});

		describe('limit', () => {
			it('using string limit should fail', async () => {
				return delegatesEndpoint
					.makeRequest({ limit: 'one' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'limit');
					});
			});

			it('using limit=-1 should fail', async () => {
				return delegatesEndpoint.makeRequest({ limit: -1 }, 400).then(res => {
					expectSwaggerParamError(res, 'limit');
				});
			});

			it('using limit=0 should fail', async () => {
				return delegatesEndpoint.makeRequest({ limit: 0 }, 400).then(res => {
					expectSwaggerParamError(res, 'limit');
				});
			});

			it('using limit=1 should be ok', async () => {
				return delegatesEndpoint.makeRequest({ limit: 1 }, 200).then(res => {
					expect(res.body.data).to.have.length(1);
				});
			});

			it('using limit=101 should be ok', async () => {
				return delegatesEndpoint.makeRequest({ limit: 101 }, 200).then(res => {
					expect(res.body.data).to.have.length(101);
				});
			});

			it('using limit > 101 should fail', async () => {
				return delegatesEndpoint.makeRequest({ limit: 102 }, 400).then(res => {
					expectSwaggerParamError(res, 'limit');
				});
			});
		});

		describe('offset', () => {
			it('using string offset should fail', async () => {
				return delegatesEndpoint
					.makeRequest({ offset: 'one' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'offset');
					});
			});

			it('using offset=1 should be ok', async () => {
				return delegatesEndpoint
					.makeRequest({ offset: 1, limit: 10 }, 200)
					.then(res => {
						expect(res.body.data).to.have.lengthOf.at.least(10);
					});
			});

			it('using offset=-1 should fail', async () => {
				return delegatesEndpoint.makeRequest({ offset: -1 }, 400).then(res => {
					expectSwaggerParamError(res, 'offset');
				});
			});
		});
	});

	describe('GET /forgers', () => {
		const forgersEndpoint = new SwaggerEndpoint('GET /delegates/forgers');

		it('using no params should be ok', async () => {
			return forgersEndpoint.makeRequest({}, 200).then(res => {
				expect(res.body.data).to.have.length(10);
			});
		});

		it('using limit=1 should be ok', async () => {
			return forgersEndpoint.makeRequest({ limit: 1 }, 200).then(res => {
				expect(res.body.data).to.have.length(1);
			});
		});

		it('using offset=1 limit=10 should be ok', async () => {
			return forgersEndpoint
				.makeRequest({ limit: 10, offset: 1 }, 200)
				.then(res => {
					expect(res.body.data).to.have.length(10);
				});
		});

		it('using limit=101 should be ok', async () => {
			return forgersEndpoint.makeRequest({ limit: 101 }, 200).then(res => {
				expect(res.body.data).to.have.length(101);
			});
		});

		it('using offset=100 should be ok', async () => {
			return forgersEndpoint.makeRequest({ offset: 100 }, 200).then(res => {
				expect(res.body.data).to.have.length(1);
			});
		});

		it('using invalid offset should fail', async () => {
			return forgersEndpoint.makeRequest({ offset: 101 }, 400).then(res => {
				expectSwaggerParamError(res, 'offset');
			});
		});

		describe('slot numbers are correct', () => {
			let forgersData;

			before(() => {
				return forgersEndpoint.makeRequest({}, 200).then(res => {
					forgersData = res.body;
				});
			});

			it('lastBlockSlot should be less or equal to currentSlot', async () => {
				return expect(forgersData.meta.lastBlockSlot).to.be.at.most(
					forgersData.meta.currentSlot
				);
			});

			it('every forger nextSlot should be greater than currentSlot', async () => {
				return forgersData.data.forEach(forger => {
					expect(forgersData.meta.currentSlot).to.be.at.most(forger.nextSlot);
				});
			});
		});
	});

	describe('GET /{address}/forging_statistics', () => {
		const forgedEndpoint = new SwaggerEndpoint(
			'GET /delegates/{address}/forging_statistics'
		);

		describe('address', () => {
			it('using known address should be ok', async () => {
				return forgedEndpoint
					.makeRequest({ address: validDelegate.address }, 200)
					.then(res => {
						const group = res.body.data;
						expect(parseInt(group.fees)).to.be.at.least(0);
						expect(parseInt(group.rewards)).to.be.at.least(0);
						expect(parseInt(group.forged)).to.be.at.least(0);
						expect(parseInt(group.count)).to.be.at.least(0);
						const meta = res.body.meta;
						expect(parseInt(meta.fromTimestamp)).to.be.at.least(0);
						expect(parseInt(meta.toTimestamp)).to.be.at.least(1);
					});
			});

			it('using unknown address without start and end filters should return empty result', async () => {
				return forgedEndpoint
					.makeRequest({ address: randomUtil.account().address }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'address');
					});
			});

			it('using unknown address with start and/or end filters should return empty result', async () => {
				const fromQueryTime = slots.getTime() - 60 * 60;
				const toQueryTime = slots.getTime();

				return forgedEndpoint
					.makeRequest(
						{
							address: randomUtil.account().address,
							fromTimestamp: fromQueryTime,
							toTimestamp: toQueryTime,
						},
						400
					)
					.then(res => {
						expectSwaggerParamError(res, 'address');
					});
			});

			it('using invalid address should fail', async () => {
				return forgedEndpoint
					.makeRequest({ address: 'InvalidAddress' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'address');
					});
			});

			it('using empty address should fail', async () => {
				return forgedEndpoint.makeRequest({ address: ' ' }, 400).then(res => {
					expectSwaggerParamError(res, 'address');
				});
			});

			it('using null address should fail', async () => {
				return forgedEndpoint.makeRequest({ address: null }, 400).then(res => {
					expectSwaggerParamError(res, 'address');
				});
			});

			describe('timestamp filters', () => {
				describe('fromTimestamp', () => {
					it('using invalid fromTimestamp should fail', async () => {
						return forgedEndpoint
							.makeRequest(
								{ address: validDelegate.address, fromTimestamp: -1 },
								400
							)
							.then(res => {
								expectSwaggerParamError(res, 'fromTimestamp');
							});
					});

					it('using valid fromTimestamp should return transactions', async () => {
						// Last hour lisk time
						const queryTime = slots.getTime() - 60 * 60;

						return forgedEndpoint
							.makeRequest(
								{ address: validDelegate.address, fromTimestamp: queryTime },
								200
							)
							.then(res => {
								const group = res.body.data;
								expect(parseInt(group.fees)).to.be.at.least(0);
								expect(parseInt(group.rewards)).to.be.at.least(0);
								expect(parseInt(group.forged)).to.be.at.least(0);
								expect(parseInt(group.count)).to.be.at.least(0);
								const meta = res.body.meta;
								expect(parseInt(meta.fromTimestamp)).to.be.at.least(0);
								expect(parseInt(meta.toTimestamp)).to.be.at.least(1);
							});
					});
				});

				describe('toTimestamp', () => {
					it('using invalid toTimestamp should fail', async () => {
						return forgedEndpoint
							.makeRequest(
								{ address: validDelegate.address, toTimestamp: 0 },
								400
							)
							.then(res => {
								expectSwaggerParamError(res, 'toTimestamp');
							});
					});

					it('using valid toTimestamp should return transactions', async () => {
						// Current lisk time
						const queryTime = slots.getTime();

						return forgedEndpoint
							.makeRequest(
								{ address: validDelegate.address, toTimestamp: queryTime },
								200
							)
							.then(res => {
								const group = res.body.data;
								expect(parseInt(group.fees)).to.be.at.least(0);
								expect(parseInt(group.rewards)).to.be.at.least(0);
								expect(parseInt(group.forged)).to.be.at.least(0);
								expect(parseInt(group.count)).to.be.at.least(0);
								const meta = res.body.meta;
								expect(parseInt(meta.fromTimestamp)).to.be.at.least(0);
								expect(parseInt(meta.toTimestamp)).to.be.at.least(1);
							});
					});
				});
			});
		});
	});
});
