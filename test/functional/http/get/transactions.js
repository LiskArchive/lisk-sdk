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

var accountFixtures = require('../../../fixtures/accounts');
var genesisblock = require('../../../data/genesis_block.json');

var transactionTypes = require('../../../../helpers/transaction_types');

var randomUtil = require('../../../common/utils/random');
var normalizer = require('../../../common/utils/normalizer');
var waitFor = require('../../../common/utils/wait_for');
var apiHelpers = require('../../../common/helpers/api');

var swaggerEndpoint = require('../../../common/swagger_spec');
var expectSwaggerParamError = apiHelpers.expectSwaggerParamError;
var slots = require('../../../../helpers/slots');

describe('GET /api/transactions', () => {
	var transactionsEndpoint = new swaggerEndpoint('GET /transactions');
	var transactionList = [];

	var account = randomUtil.account();
	var account2 = randomUtil.account();
	var minAmount = 20 * normalizer; // 20 LSK
	var maxAmount = 100 * normalizer; // 100 LSK

	// Crediting accounts
	before(() => {
		var promises = [];

		var transaction1 = lisk.transaction.createTransaction(
			account.address,
			maxAmount,
			accountFixtures.genesis.password
		);
		var transaction2 = lisk.transaction.createTransaction(
			account2.address,
			minAmount,
			accountFixtures.genesis.password
		);
		promises.push(apiHelpers.sendTransactionPromise(transaction1));
		promises.push(apiHelpers.sendTransactionPromise(transaction2));
		return Promise.all(promises).then(() => {
			transactionList.push(transaction1);
			transactionList.push(transaction2);
			return waitFor.confirmations(_.map(transactionList, 'id'));
		});
	});

	describe('?', () => {
		describe('with wrong input', () => {
			it('using valid array-like parameters should fail', () => {
				return transactionsEndpoint
					.makeRequest(
						{
							blockId: '1',
							senderId: `${accountFixtures.genesis.address},${account.address}`,
							senderPublicKey: accountFixtures.genesis.publicKey,
							recipientPublicKey: `${accountFixtures.genesis.publicKey},${
								account.publicKey
							}`,
							sort: 'amount:asc',
						},
						400
					)
					.then(res => {
						expectSwaggerParamError(res, 'senderId');
					});
			});

			it('using invalid field name should fail', () => {
				return transactionsEndpoint
					.makeRequest(
						{
							blockId: '1',
							whatever: accountFixtures.genesis.address,
						},
						400
					)
					.then(res => {
						expectSwaggerParamError(res, 'whatever');
					});
			});

			it('using invalid condition should fail', () => {
				return transactionsEndpoint
					.makeRequest(
						{
							'whatever:senderId': accountFixtures.genesis.address,
						},
						400
					)
					.then(res => {
						expectSwaggerParamError(res, 'whatever:senderId');
					});
			});

			it('using invalid field name (x:z) should fail', () => {
				return transactionsEndpoint
					.makeRequest(
						{
							'and:senderId': accountFixtures.genesis.address,
						},
						400
					)
					.then(res => {
						expectSwaggerParamError(res, 'and:senderId');
					});
			});

			it('using empty parameter should fail', () => {
				return transactionsEndpoint
					.makeRequest(
						{
							publicKey: '',
						},
						400
					)
					.then(res => {
						expectSwaggerParamError(res, 'publicKey');
					});
			});

			it('using completely invalid fields should fail', () => {
				return transactionsEndpoint
					.makeRequest(
						{
							blockId: 'invalid',
							senderId: 'invalid',
							recipientId: 'invalid',
							limit: 'invalid',
							offset: 'invalid',
							sort: 'invalid',
						},
						400
					)
					.then(res => {
						expectSwaggerParamError(res, 'blockId');
						expectSwaggerParamError(res, 'senderId');
						expectSwaggerParamError(res, 'recipientId');
						expectSwaggerParamError(res, 'limit');
						expectSwaggerParamError(res, 'offset');
						expectSwaggerParamError(res, 'sort');
					});
			});

			it('using partially invalid fields should fail', () => {
				return transactionsEndpoint
					.makeRequest(
						{
							blockId: 'invalid',
							senderId: 'invalid',
							recipientId: account.address,
							limit: 'invalid',
							offset: 'invalid',
							sort: 'invalid',
						},
						400
					)
					.then(res => {
						expectSwaggerParamError(res, 'blockId');
						expectSwaggerParamError(res, 'senderId');
						expectSwaggerParamError(res, 'limit');
						expectSwaggerParamError(res, 'offset');
						expectSwaggerParamError(res, 'sort');
					});
			});
		});

		it('using no params should be ok', () => {
			return transactionsEndpoint.makeRequest({}, 200).then(res => {
				expect(res.body.data).to.not.empty;
			});
		});

		describe('id', () => {
			it('using valid id should be ok', () => {
				var transactionInCheck = transactionList[0];

				return transactionsEndpoint
					.makeRequest({ id: transactionInCheck.id }, 200)
					.then(res => {
						expect(res.body.data).to.not.empty;
						expect(res.body.data).to.has.length(1);
						expect(res.body.data[0].id).to.be.equal(transactionInCheck.id);
					});
			});

			it('using invalid id should fail', () => {
				return transactionsEndpoint
					.makeRequest({ id: '79fjdfd' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'id');
					});
			});

			it('should get transaction with asset for id', () => {
				var transactionInCheck = genesisblock.transactions.find(trs => {
					// Vote type transaction from genesisBlock
					return trs.id === '9314232245035524467';
				});

				return transactionsEndpoint
					.makeRequest({ id: transactionInCheck.id }, 200)
					.then(res => {
						expect(res.body.data).to.not.empty;
						expect(res.body.data).to.has.length(1);

						var transaction = res.body.data[0];

						expect(transaction.id).to.be.equal(transactionInCheck.id);
						expect(transaction.type).to.be.equal(transactionTypes.VOTE);
						expect(transaction.type).to.be.equal(transactionInCheck.type);
						expect(transaction.amount).to.be.equal(
							transactionInCheck.amount.toString()
						);
						expect(transaction.fee).to.be.equal(
							transactionInCheck.fee.toString()
						);
						expect(transaction.recipientId).to.be.equal(
							transactionInCheck.recipientId
						);
						expect(transaction.senderId).to.be.equal(
							transactionInCheck.senderId
						);
						expect(transaction.asset).to.be.eql(transactionInCheck.asset);
					});
			});
		});

		describe('type', () => {
			it('using invalid type should fail', () => {
				return transactionsEndpoint.makeRequest({ type: 8 }, 400).then(res => {
					expectSwaggerParamError(res, 'type');
				});
			});

			it('using type should be ok', () => {
				return transactionsEndpoint
					.makeRequest({ type: transactionTypes.SEND }, 200)
					.then(res => {
						expect(res.body.data).to.not.empty;
						res.body.data.map(transaction => {
							expect(transaction.type).to.be.equal(transactionTypes.SEND);
						});
					});
			});
		});

		describe('senderId', () => {
			it('using invalid senderId should fail', () => {
				return transactionsEndpoint
					.makeRequest({ senderId: '' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'senderId');
					});
			});

			it('using one senderId should return transactions', () => {
				return transactionsEndpoint
					.makeRequest({ senderId: accountFixtures.genesis.address }, 200)
					.then(res => {
						expect(res.body.data).to.not.empty;

						res.body.data.map(transaction => {
							expect(transaction.senderId).to.be.equal(
								accountFixtures.genesis.address
							);
						});
					});
			});

			it('using multiple senderId should fail', () => {
				return transactionsEndpoint
					.makeRequest(
						{
							senderId: [
								accountFixtures.genesis.address,
								accountFixtures.existingDelegate.address,
							],
						},
						400
					)
					.then(res => {
						expectSwaggerParamError(res, 'senderId');
					});
			});
		});

		describe('senderPublicKey', () => {
			it('using invalid senderPublicKey should fail', () => {
				return transactionsEndpoint
					.makeRequest({ senderPublicKey: '' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'senderPublicKey');
					});
			});

			it('using one senderPublicKey should return transactions', () => {
				return transactionsEndpoint
					.makeRequest(
						{ senderPublicKey: accountFixtures.genesis.publicKey },
						200
					)
					.then(res => {
						expect(res.body.data).to.not.empty;

						res.body.data.map(transaction => {
							expect(transaction.senderPublicKey).to.be.equal(
								accountFixtures.genesis.publicKey
							);
						});
					});
			});

			it('using multiple senderPublicKey should fail', () => {
				return transactionsEndpoint
					.makeRequest(
						{
							senderPublicKey: [
								accountFixtures.genesis.publicKey,
								accountFixtures.existingDelegate.publicKey,
							],
						},
						400
					)
					.then(res => {
						expectSwaggerParamError(res, 'senderPublicKey');
					});
			});
		});

		describe('recipientId', () => {
			it('using invalid recipientId should fail', () => {
				return transactionsEndpoint
					.makeRequest({ recipientId: '' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'recipientId');
					});
			});

			it('using one recipientId should return transactions', () => {
				return transactionsEndpoint
					.makeRequest({ recipientId: accountFixtures.genesis.address }, 200)
					.then(res => {
						expect(res.body.data).to.not.empty;

						res.body.data.map(transaction => {
							expect(transaction.recipientId).to.be.equal(
								accountFixtures.genesis.address
							);
						});
					});
			});

			it('using multiple recipientId should fail', () => {
				return transactionsEndpoint
					.makeRequest(
						{
							recipientId: [
								accountFixtures.genesis.address,
								accountFixtures.existingDelegate.address,
							],
						},
						400
					)
					.then(res => {
						expectSwaggerParamError(res, 'recipientId');
					});
			});
		});

		describe('recipientPublicKey', () => {
			it('using invalid recipientPublicKey should fail', () => {
				return transactionsEndpoint
					.makeRequest({ recipientPublicKey: '' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'recipientPublicKey');
					});
			});

			it('using one recipientPublicKey should return transactions', () => {
				return transactionsEndpoint
					.makeRequest(
						{ recipientPublicKey: accountFixtures.genesis.publicKey },
						200
					)
					.then(res => {
						expect(res.body.data).to.not.empty;

						res.body.data.map(transaction => {
							expect(transaction.recipientPublicKey).to.be.equal(
								accountFixtures.genesis.publicKey
							);
						});
					});
			});

			it('using multiple recipientPublicKey should fail', () => {
				return transactionsEndpoint
					.makeRequest(
						{
							recipientPublicKey: [
								accountFixtures.genesis.publicKey,
								accountFixtures.existingDelegate.publicKey,
							],
						},
						400
					)
					.then(res => {
						expectSwaggerParamError(res, 'recipientPublicKey');
					});
			});
		});

		describe('blockId', () => {
			it('using invalid blockId should fail', () => {
				return transactionsEndpoint
					.makeRequest({ blockId: '' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'blockId');
					});
			});

			it('using one blockId should return transactions', () => {
				var blockId = '6524861224470851795';

				return transactionsEndpoint
					.makeRequest({ blockId: blockId }, 200)
					.then(res => {
						res.body.data.map(transaction => {
							expect(transaction.blockId).to.be.equal(blockId);
						});
					});
			});
		});

		describe('height', () => {
			it('using invalid height should fail', () => {
				return transactionsEndpoint
					.makeRequest({ height: '' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'height');
					});
			});

			it('using one height should return transactions', () => {
				return transactionsEndpoint
					.makeRequest({ height: 1 }, 200)
					.then(res => {
						res.body.data.map(transaction => {
							expect(transaction.height).to.be.equal(1);
						});
					});
			});
		});

		describe('minAmount', () => {
			it('should get transactions with amount more than minAmount', () => {
				return transactionsEndpoint
					.makeRequest({ minAmount: minAmount }, 200)
					.then(res => {
						res.body.data.map(transaction => {
							expect(parseInt(transaction.amount)).to.be.at.least(minAmount);
						});
					});
			});
		});

		describe('maxAmount', () => {
			it('should get transactions with amount less than maxAmount', () => {
				return transactionsEndpoint
					.makeRequest({ maxAmount: maxAmount }, 200)
					.then(res => {
						res.body.data.map(transaction => {
							expect(parseInt(transaction.amount)).to.be.at.most(maxAmount);
						});
					});
			});
		});

		describe('fromTimestamp', () => {
			it('using too small fromTimestamp should fail', () => {
				return transactionsEndpoint
					.makeRequest({ fromTimestamp: -1 }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'fromTimestamp');
					});
			});

			it('using valid fromTimestamp should return transactions', () => {
				// Last hour lisk time
				var queryTime = slots.getTime() - 60 * 60;

				return transactionsEndpoint
					.makeRequest({ fromTimestamp: queryTime }, 200)
					.then(res => {
						res.body.data.forEach(transaction => {
							expect(transaction.timestamp).to.be.at.least(queryTime);
						});
					});
			});
		});

		describe('toTimestamp', () => {
			it('using too small toTimestamp should fail', () => {
				return transactionsEndpoint
					.makeRequest({ toTimestamp: 0 }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'toTimestamp');
					});
			});

			it('using valid toTimestamp should return transactions', () => {
				// Current lisk time
				var queryTime = slots.getTime();

				return transactionsEndpoint
					.makeRequest({ toTimestamp: queryTime }, 200)
					.then(res => {
						res.body.data.forEach(transaction => {
							expect(transaction.timestamp).to.be.at.most(queryTime);
						});
					});
			});
		});

		describe('limit', () => {
			it('using limit < 0 should fail', () => {
				return transactionsEndpoint
					.makeRequest({ limit: -1 }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'limit');
					});
			});

			it('using limit > 100 should fail', () => {
				return transactionsEndpoint
					.makeRequest({ limit: 101 }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'limit');
					});
			});

			it('using limit = 10 should return 10 transactions', () => {
				return transactionsEndpoint
					.makeRequest({ limit: 10 }, 200)
					.then(res => {
						expect(res.body.data).to.have.length(10);
					});
			});
		});

		describe('offset', () => {
			it('using offset="one" should fail', () => {
				return transactionsEndpoint
					.makeRequest({ offset: 'one' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'offset');
					});
			});

			it('using offset=1 should be ok', () => {
				var firstTransaction = null;

				return transactionsEndpoint
					.makeRequest({ offset: 0 }, 200)
					.then(res => {
						firstTransaction = res.body.data[0];

						return transactionsEndpoint.makeRequest({ offset: 1 }, 200);
					})
					.then(res => {
						res.body.data.forEach(transaction => {
							expect(transaction.id).to.not.equal(firstTransaction.id);
						});
					});
			});
		});

		describe('sort', () => {
			describe('amount', () => {
				it('sorted by amount:asc should be ok', () => {
					return transactionsEndpoint
						.makeRequest({ sort: 'amount:asc', minAmount: 100 }, 200)
						.then(res => {
							var values = _.map(res.body.data, 'amount').map(value => {
								return parseInt(value);
							});

							expect(_(_.clone(values)).sortNumbers('asc')).to.be.eql(values);
						});
				});

				it('sorted by amount:desc should be ok', () => {
					return transactionsEndpoint
						.makeRequest({ sort: 'amount:desc' }, 200)
						.then(res => {
							var values = _.map(res.body.data, 'amount').map(value => {
								return parseInt(value);
							});

							expect(_(_.clone(values)).sortNumbers('desc')).to.be.eql(values);
						});
				});
			});

			describe('fee', () => {
				it('sorted by fee:asc should be ok', () => {
					return transactionsEndpoint
						.makeRequest({ sort: 'fee:asc', minAmount: 100 }, 200)
						.then(res => {
							var values = _.map(res.body.data, 'fee').map(value => {
								return parseInt(value);
							});

							expect(_(_.clone(values)).sortNumbers('asc')).to.be.eql(values);
						});
				});

				it('sorted by fee:desc should be ok', () => {
					return transactionsEndpoint
						.makeRequest({ sort: 'fee:desc' }, 200)
						.then(res => {
							var values = _.map(res.body.data, 'fee').map(value => {
								return parseInt(value);
							});

							expect(_(_.clone(values)).sortNumbers('desc')).to.be.eql(values);
						});
				});
			});

			describe('type', () => {
				it('sorted by fee:asc should be ok', () => {
					return transactionsEndpoint
						.makeRequest({ sort: 'type:asc', minAmount: 100 }, 200)
						.then(res => {
							expect(
								_(res.body.data)
									.map('type')
									.sortNumbers('asc')
							).to.be.eql(_.map(res.body.data, 'type'));
						});
				});

				it('sorted by fee:desc should be ok', () => {
					return transactionsEndpoint
						.makeRequest({ sort: 'type:desc' }, 200)
						.then(res => {
							expect(
								_(res.body.data)
									.map('type')
									.sortNumbers('desc')
							).to.be.eql(_.map(res.body.data, 'type'));
						});
				});
			});

			describe('timestamp', () => {
				it('sorted by timestamp:asc should be ok', () => {
					return transactionsEndpoint
						.makeRequest({ sort: 'timestamp:asc', minAmount: 100 }, 200)
						.then(res => {
							expect(
								_(res.body.data)
									.map('timestamp')
									.sortNumbers('asc')
							).to.be.eql(_.map(res.body.data, 'timestamp'));
						});
				});

				it('sorted by timestamp:desc should be ok', () => {
					return transactionsEndpoint
						.makeRequest({ sort: 'timestamp:desc' }, 200)
						.then(res => {
							expect(
								_(res.body.data)
									.map('timestamp')
									.sortNumbers('desc')
							).to.be.eql(_.map(res.body.data, 'timestamp'));
						});
				});
			});

			it('using sort with any of sort fields should not place NULLs first', () => {
				var transactionSortFields = [
					'amount:asc',
					'amount:desc',
					'fee:asc',
					'fee:desc',
					'type:asc',
					'type:desc',
					'timestamp:asc',
					'timestamp:desc',
				];

				return Promise.each(transactionSortFields, sortField => {
					return transactionsEndpoint
						.makeRequest({ sort: sortField }, 200)
						.then(res => {
							var dividedIndices = res.body.data.reduce(
								(memo, peer, index) => {
									memo[
										peer[sortField] === null ? 'nullIndices' : 'notNullIndices'
									].push(index);
									return memo;
								},
								{ notNullIndices: [], nullIndices: [] }
							);

							if (
								dividedIndices.nullIndices.length &&
								dividedIndices.notNullIndices.length
							) {
								var ascOrder = function(a, b) {
									return a - b;
								};
								dividedIndices.notNullIndices.sort(ascOrder);
								dividedIndices.nullIndices.sort(ascOrder);

								expect(
									dividedIndices.notNullIndices[
										dividedIndices.notNullIndices.length - 1
									]
								).to.be.at.most(dividedIndices.nullIndices[0]);
							}
						});
				});
			});

			it('using any other sort field should fail', () => {
				return transactionsEndpoint
					.makeRequest({ sort: 'height:asc' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'sort');
					});
			});
		});

		describe('minAmount & maxAmount & sort', () => {
			it('using minAmount, maxAmount sorted by amount should return sorted transactions', () => {
				return transactionsEndpoint
					.makeRequest(
						{
							minAmount: minAmount,
							maxAmount: maxAmount,
							sort: 'amount:asc',
						},
						200
					)
					.then(res => {
						var values = _.map(res.body.data, 'amount').map(value => {
							return parseInt(value);
						});

						expect(_(_.clone(values)).sortNumbers('asc')).to.be.eql(values);

						values.forEach(value => {
							expect(value).to.be.at.most(maxAmount);
							expect(value).to.be.at.least(minAmount);
						});
					});
			});
		});

		describe('combination of query parameters', () => {
			it('using valid parameters should be ok', () => {
				return transactionsEndpoint
					.makeRequest(
						{
							senderId: accountFixtures.genesis.address,
							recipientId: account.address,
							limit: 10,
							offset: 0,
							sort: 'amount:asc',
						},
						200
					)
					.then(res => {
						var values = _.map(res.body.data, 'amount').map(value => {
							return parseInt(value);
						});
						expect(_(_.clone(values)).sortNumbers('asc')).to.be.eql(values);

						res.body.data.forEach(transaction => {
							expect(transaction.senderId).to.be.eql(
								accountFixtures.genesis.address
							);
							expect(transaction.recipientId).to.be.eql(account.address);
						});
					});
			});
		});

		describe('meta', () => {
			describe('count', () => {
				it('should return count of the transactions with response', () => {
					return transactionsEndpoint.makeRequest({}, 200).then(res => {
						expect(res.body.meta.count).to.be.a('number');
					});
				});
			});
		});
	});
});
