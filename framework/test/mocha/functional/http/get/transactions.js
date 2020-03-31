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

require('../../functional');
const Promise = require('bluebird');
const { transfer, castVotes } = require('@liskhq/lisk-transactions');
const { getAddressFromPublicKey } = require('@liskhq/lisk-cryptography');
const accountFixtures = require('../../../../fixtures/accounts');
const randomUtil = require('../../../../utils/random');
const waitFor = require('../../../../utils/legacy/wait_for');
const apiHelpers = require('../../../../utils/http/api');
const SwaggerEndpoint = require('../../../../utils/http/swagger_spec');
const {
	getNetworkIdentifier,
} = require('../../../../utils/network_identifier');

const networkIdentifier = getNetworkIdentifier(
	__testContext.config.genesisBlock,
);

const TRANSACTION_TYPES_TRANSFER = 8;
const TRANSACTION_TYPES_DELEGATE = 10;
const TRANSACTION_TYPES_VOTE = 11;

const { NORMALIZER } = global.__testContext.config;
const expectSwaggerParamError = apiHelpers.expectSwaggerParamError;

describe('GET /api/transactions', () => {
	const transactionsEndpoint = new SwaggerEndpoint('GET /transactions');
	const transactionList = [];

	const account = randomUtil.account();
	const account2 = randomUtil.account();
	const account3 = accountFixtures.existingDelegate;
	const minAmount = 20 * NORMALIZER; // 20 LSK
	const maxAmount = 100 * NORMALIZER; // 100 LSK
	const transaction1 = transfer({
		networkIdentifier,
		nonce: '0',
		fee: BigInt(10000000).toString(),
		amount: maxAmount.toString(),
		passphrase: accountFixtures.genesis.passphrase,
		recipientId: account.address,
		data: 'transaction1',
	});
	const transaction2 = transfer({
		networkIdentifier,
		nonce: '1',
		fee: BigInt(10000000).toString(),
		amount: minAmount.toString(),
		passphrase: accountFixtures.genesis.passphrase,
		recipientId: account2.address,
		data: 'transaction2 ฿',
	});
	const transaction3 = transfer({
		networkIdentifier,
		nonce: '2',
		fee: BigInt(10000000).toString(),
		amount: (20 * NORMALIZER).toString(), // 20 LSK
		passphrase: account.passphrase,
		recipientId: account2.address,
		data: 'hey :)',
	});
	const transaction5 = transfer({
		networkIdentifier,
		nonce: '4',
		fee: BigInt(10000000).toString(),
		amount: minAmount.toString(),
		passphrase: accountFixtures.genesis.passphrase,
		recipientId: account3.address,
		data: 'tx 5',
	});
	const transactionType3 = castVotes({
		networkIdentifier,
		nonce: '5',
		fee: BigInt(100000000).toString(),
		passphrase: account2.passphrase,
		votes: [`${accountFixtures.existingDelegate.publicKey}`],
	});

	// Crediting accounts'
	before(() => {
		const promises = [];
		promises.push(apiHelpers.sendTransactionPromise(transaction1));
		promises.push(apiHelpers.sendTransactionPromise(transaction2));
		promises.push(apiHelpers.sendTransactionPromise(transaction5));

		return Promise.all(promises).then(() => {
			transactionList.push(transaction1);
			transactionList.push(transaction2);
			transactionList.push(transaction5);

			return waitFor
				.confirmations(_.map(transactionList, 'id'))
				.then(() =>
					Promise.all([
						apiHelpers.sendTransactionPromise(transaction3),
						apiHelpers.sendTransactionPromise(transactionType3),
					]),
				)
				.then(() => {
					transactionList.push(transaction3);
					transactionList.push(transactionType3);
					return waitFor.confirmations([transaction3.id, transactionType3.id]);
				});
		});
	});

	describe('?', () => {
		describe('with wrong input', () => {
			it('using valid array-like parameters should fail', async () => {
				return transactionsEndpoint
					.makeRequest(
						{
							blockId: '1',
							senderId: `${accountFixtures.genesis.address},${account.address}`,
							senderPublicKey: accountFixtures.genesis.publicKey,
							recipientPublicKey: `${accountFixtures.genesis.publicKey},${account.publicKey}`,
							sort: 'amount:asc',
						},
						400,
					)
					.then(res => {
						expectSwaggerParamError(res, 'senderId');
					});
			});

			it('using invalid field name should fail', async () => {
				return transactionsEndpoint
					.makeRequest(
						{
							blockId: '1',
							whatever: accountFixtures.genesis.address,
						},
						400,
					)
					.then(res => {
						expectSwaggerParamError(res, 'whatever');
					});
			});

			it('using invalid field name (x:z) should fail', async () => {
				return transactionsEndpoint
					.makeRequest(
						{
							'and:senderId': accountFixtures.genesis.address,
						},
						400,
					)
					.then(res => {
						expectSwaggerParamError(res, 'and:senderId');
					});
			});

			it('using empty parameter should fail', async () => {
				return transactionsEndpoint
					.makeRequest(
						{
							publicKey: '',
						},
						400,
					)
					.then(res => {
						expectSwaggerParamError(res, 'publicKey');
					});
			});

			it('using completely invalid fields should fail', async () => {
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
						400,
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

			it('using partially invalid fields should fail', async () => {
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
						400,
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

		it('using no params should be ok', async () => {
			return transactionsEndpoint.makeRequest({}, 200).then(res => {
				expect(res.body.data).to.not.empty;
			});
		});

		describe('id', () => {
			it('using valid id should be ok', async () => {
				const transactionInCheck = transactionList[0];

				return transactionsEndpoint
					.makeRequest({ id: transactionInCheck.id }, 200)
					.then(res => {
						expect(res.body.data).to.not.empty;
						expect(res.body.data).to.has.length(1);
						expect(res.body.data[0].id).to.be.equal(transactionInCheck.id);
					});
			});

			it('using invalid id should fail', async () => {
				return transactionsEndpoint
					.makeRequest({ id: '79fjdfd' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'id');
					});
			});

			it('should get transaction with asset for id', async () => {
				const transactionInCheck = __testContext.config.genesisBlock.transactions.find(
					trs => {
						// Vote type transaction from genesisBlock
						return trs.id === '17552532729871392055';
					},
				);

				return transactionsEndpoint
					.makeRequest({ id: transactionInCheck.id }, 200)
					.then(res => {
						expect(res.body.data).to.not.empty;
						expect(res.body.data).to.has.length(1);

						const transaction = res.body.data[0];

						expect(transaction.id).to.be.equal(transactionInCheck.id);
						expect(transaction.type).to.be.equal(TRANSACTION_TYPES_VOTE);
						expect(transaction.type).to.be.equal(transactionInCheck.type);
						expect(transaction.fee).to.be.equal('0');
						expect(transaction.senderId).to.be.equal(
							getAddressFromPublicKey(transactionInCheck.senderPublicKey),
						);
						expect(transaction.asset.votes).to.be.eql(
							transactionInCheck.asset.votes,
						);
					});
			});
		});

		describe('type', () => {
			it('using invalid type should fail', async () => {
				const res = await transactionsEndpoint.makeRequest({ type: 'a' }, 400);
				expectSwaggerParamError(res, 'type');
			});

			it('using type should be ok', async () => {
				const res = await transactionsEndpoint.makeRequest(
					{ type: TRANSACTION_TYPES_TRANSFER },
					200,
				);

				expect(res.body.data).to.not.empty;
				res.body.data.map(transaction => {
					return expect(transaction.type).to.be.equal(
						TRANSACTION_TYPES_TRANSFER,
					);
				});
			});

			describe('asset field', () => {
				it('using type 0 should return asset field with correct properties', async () => {
					const res = await transactionsEndpoint.makeRequest(
						{ type: TRANSACTION_TYPES_TRANSFER },
						200,
					);

					expect(res.body.data).to.not.empty;
					res.body.data.map(transaction =>
						expect(Object.keys(transaction.asset).length).to.be.greaterThan(1),
					);
				});

				it('using type 2 should return asset field with correct properties', async () => {
					const res = await transactionsEndpoint.makeRequest(
						{ type: TRANSACTION_TYPES_DELEGATE },
						200,
					);

					expect(res.body.data).to.not.empty;
					res.body.data.map(transaction => {
						expect(transaction.asset).to.have.property('publicKey');
						expect(transaction.asset).to.have.property('username');
						return expect(transaction.asset).to.have.property('address');
					});
				});

				it('using type 3 should return asset field with correct properties', async () => {
					const res = await transactionsEndpoint.makeRequest(
						{ type: TRANSACTION_TYPES_VOTE },
						200,
					);

					expect(res.body.data).to.not.empty;
					// Skip Genesis vote transaction - exception as it contains 101 votes
					const transactionsType3 = res.body.data.filter(
						transaction => transaction.id !== '17552532729871392055',
					);
					expect(transactionsType3.length).to.be.above(0);
					transactionsType3.map(transaction => {
						expect(Object.keys(transaction.asset).length).to.equal(1);
						return expect(transaction.asset.votes.length).to.be.within(1, 33);
					});
				});
			});
		});

		describe('senderId', () => {
			it('using invalid senderId should fail', async () => {
				return transactionsEndpoint
					.makeRequest({ senderId: '' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'senderId');
					});
			});

			it('using one senderId should return transactions', async () => {
				return transactionsEndpoint
					.makeRequest({ senderId: accountFixtures.genesis.address }, 200)
					.then(res => {
						expect(res.body.data).to.not.empty;

						res.body.data.map(transaction => {
							return expect(transaction.senderId).to.be.equal(
								accountFixtures.genesis.address,
							);
						});
					});
			});

			it('using multiple senderId should fail', async () => {
				return transactionsEndpoint
					.makeRequest(
						{
							senderId: [
								accountFixtures.genesis.address,
								accountFixtures.existingDelegate.address,
							],
						},
						400,
					)
					.then(res => {
						expectSwaggerParamError(res, 'senderId');
					});
			});
		});

		describe('senderPublicKey', () => {
			it('using invalid senderPublicKey should fail', async () => {
				return transactionsEndpoint
					.makeRequest({ senderPublicKey: '' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'senderPublicKey');
					});
			});

			it('using one senderPublicKey should return transactions', async () => {
				return transactionsEndpoint
					.makeRequest(
						{ senderPublicKey: accountFixtures.genesis.publicKey },
						200,
					)
					.then(res => {
						expect(res.body.data).to.not.empty;

						res.body.data.map(transaction => {
							return expect(transaction.senderPublicKey).to.be.equal(
								accountFixtures.genesis.publicKey,
							);
						});
					});
			});

			it('using multiple senderPublicKey should fail', async () => {
				return transactionsEndpoint
					.makeRequest(
						{
							senderPublicKey: [
								accountFixtures.genesis.publicKey,
								accountFixtures.existingDelegate.publicKey,
							],
						},
						400,
					)
					.then(res => {
						expectSwaggerParamError(res, 'senderPublicKey');
					});
			});
		});

		describe('recipientId', () => {
			it('using invalid recipientId should fail', async () => {
				return transactionsEndpoint
					.makeRequest({ recipientId: '' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'recipientId');
					});
			});

			it('using one recipientId should return transactions', async () => {
				return transactionsEndpoint
					.makeRequest({ recipientId: accountFixtures.genesis.address }, 200)
					.then(res => {
						expect(res.body.data).to.not.empty;

						res.body.data.map(transaction => {
							return expect(transaction.asset.recipientId).to.be.equal(
								accountFixtures.genesis.address,
							);
						});
					});
			});

			it('using multiple recipientId should fail', async () => {
				return transactionsEndpoint
					.makeRequest(
						{
							recipientId: [
								accountFixtures.genesis.address,
								accountFixtures.existingDelegate.address,
							],
						},
						400,
					)
					.then(res => {
						expectSwaggerParamError(res, 'recipientId');
					});
			});
		});

		describe('senderIdOrRecipientId', () => {
			it('using empty senderIdOrRecipientId should fail', async () => {
				return transactionsEndpoint
					.makeRequest({ senderIdOrRecipientId: '' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'senderIdOrRecipientId');
					});
			});
			it('using invalid senderIdOrRecipientId should fail', async () => {
				return transactionsEndpoint
					.makeRequest(
						{ senderIdOrRecipientId: '1234567890123456789012L' },
						400,
					)
					.then(res => {
						expectSwaggerParamError(res, 'senderIdOrRecipientId');
					});
			});
			it('using senderIdOrRecipientId should return incoming and outgoing transactions of an account', async () => {
				const accountId = account.address;
				return transactionsEndpoint
					.makeRequest({ senderIdOrRecipientId: accountId }, 200)
					.then(res => {
						expect(res.body.data).to.not.empty;
						expect(res.body.data[0].senderId).to.be.eql(accountId);
						expect(res.body.data[1].asset.recipientId).to.be.eql(accountId);
					});
			});
		});

		describe('blockId', () => {
			it('using invalid blockId should fail', async () => {
				return transactionsEndpoint
					.makeRequest({ blockId: '' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'blockId');
					});
			});

			it('using one blockId should return transactions', async () => {
				const blockId = '1349213844499460766';

				return transactionsEndpoint.makeRequest({ blockId }, 200).then(res => {
					res.body.data.map(transaction => {
						return expect(transaction.blockId).to.be.equal(blockId);
					});
				});
			});
		});

		describe('height', () => {
			it('using invalid height should fail', async () => {
				return transactionsEndpoint
					.makeRequest({ height: '' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'height');
					});
			});

			it('should filter transactions for a given height', async () => {
				const {
					body: {
						data: [tx],
					},
				} = await transactionsEndpoint.makeRequest(
					{ id: transaction1.id },
					200,
				);
				const {
					body: { data: transactions },
				} = await transactionsEndpoint.makeRequest({ height: tx.height }, 200);

				const haveSameHeight = transactions.reduce(
					(acc, curr) => acc && curr.height === tx.height,
					true,
				);

				expect(transactions).to.not.be.empty;
				expect(haveSameHeight).to.be.true;
			});
		});

		describe('minAmount', () => {
			it('should get transactions with amount more than minAmount', async () => {
				return transactionsEndpoint
					.makeRequest({ minAmount }, 200)
					.then(res => {
						res.body.data.map(transaction => {
							return expect(
								parseInt(transaction.asset.amount, 10),
							).to.be.at.least(minAmount);
						});
					});
			});
		});

		describe('maxAmount', () => {
			it('should get transactions with amount less than maxAmount', async () => {
				return transactionsEndpoint
					.makeRequest({ maxAmount }, 200)
					.then(res => {
						res.body.data.map(transaction => {
							return expect(
								parseInt(transaction.asset.amount || 0, 10),
							).to.be.at.most(maxAmount);
						});
					});
			});
		});

		describe('data', () => {
			it('using specific string should return transactions', async () => {
				const dataFilter = 'transaction1';
				return transactionsEndpoint
					.makeRequest(
						{
							data: dataFilter,
						},
						200,
					)
					.then(res => {
						expect(res.body.data.length).to.greaterThan(0);
						_.map(res.body.data, transaction => {
							return expect(transaction.asset.data).to.include(dataFilter);
						});
					});
			});

			it('using unicode null characters should return no transaction', () => {
				// This case works in Javascripts but not in CURL or POSTMAN
				const dataFilter = '\u0000 hey :)';
				return transactionsEndpoint
					.makeRequest(
						{
							data: dataFilter,
						},
						200,
					)
					.then(res => {
						expect(res.body.data.length).to.eql(0);
					});
			});

			it('using regex string should return several transactions', async () => {
				const dataFilter = 'transaction';
				const fuzzyCommand = '%';
				return transactionsEndpoint
					.makeRequest(
						{
							data: dataFilter + fuzzyCommand,
						},
						200,
					)
					.then(res => {
						expect(res.body.data.length).to.greaterThan(1);
						_.map(res.body.data, transaction => {
							return expect(transaction.asset.data).to.include(dataFilter);
						});
					});
			});

			it('using unicode character combine with regEx should return transactions', async () => {
				const unicodeCharacter = '฿';
				const fuzzyCommand = '%';
				return transactionsEndpoint
					.makeRequest(
						{
							data: fuzzyCommand + unicodeCharacter + fuzzyCommand,
						},
						200,
					)
					.then(res => {
						expect(res.body.data.length).to.greaterThan(0);
						_.map(res.body.data, transaction => {
							return expect(transaction.asset.data).to.include(
								unicodeCharacter,
							);
						});
					});
			});
		});

		describe('limit', () => {
			it('using limit < 0 should fail', async () => {
				return transactionsEndpoint
					.makeRequest({ limit: -1 }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'limit');
					});
			});

			it('using limit > 100 should fail', async () => {
				return transactionsEndpoint
					.makeRequest({ limit: 101 }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'limit');
					});
			});

			it('using limit = 10 should return 10 transactions', async () => {
				return transactionsEndpoint
					.makeRequest({ limit: 10 }, 200)
					.then(res => {
						expect(res.body.data).to.have.length(10);
					});
			});
		});

		describe('offset', () => {
			it('using offset="one" should fail', async () => {
				return transactionsEndpoint
					.makeRequest({ offset: 'one' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'offset');
					});
			});

			it('should paginate consistently when using offset with unprecise sorting param', async () => {
				let lastId = null;
				let firstId = null;
				const limit = 51;

				return transactionsEndpoint
					.makeRequest(
						{ height: 1, offset: 0, limit, sort: 'amount:desc' },
						200,
					)
					.then(res => {
						lastId = res.body.data[limit - 1].id;

						return transactionsEndpoint.makeRequest(
							{ height: 1, offset: limit - 1, limit, sort: 'amount:desc' },
							200,
						);
					})
					.then(res => {
						firstId = res.body.data[0].id;
						expect(firstId).to.equal(lastId);
					});
			});
		});

		describe('sort', () => {
			describe('amount', () => {
				it('sorted by amount:asc should be ok', async () => {
					return transactionsEndpoint
						.makeRequest({ sort: 'amount:asc', minAmount: 100 }, 200)
						.then(res => {
							const values = _.map(res.body.data, 'amount').map(value => {
								return parseInt(value, 10);
							});

							expect(_(_.clone(values)).sortNumbers('asc')).to.be.eql(values);
						});
				});

				it('sorted by amount:desc should be ok', async () => {
					return transactionsEndpoint
						.makeRequest({ sort: 'amount:desc' }, 200)
						.then(res => {
							const values = _.map(res.body.data, 'amount').map(value => {
								return parseInt(value, 10);
							});

							expect(_(_.clone(values)).sortNumbers('desc')).to.be.eql(values);
						});
				});
			});

			describe('fee', () => {
				it('sorted by fee:asc should be ok', async () => {
					return transactionsEndpoint
						.makeRequest({ sort: 'fee:asc', minAmount: 100 }, 200)
						.then(res => {
							const values = _.map(res.body.data, 'fee').map(value => {
								return parseInt(value, 10);
							});

							expect(_(_.clone(values)).sortNumbers('asc')).to.be.eql(values);
						});
				});

				it('sorted by fee:desc should be ok', async () => {
					return transactionsEndpoint
						.makeRequest({ sort: 'fee:desc' }, 200)
						.then(res => {
							const values = _.map(res.body.data, 'fee').map(value => {
								return parseInt(value, 10);
							});

							expect(_(_.clone(values)).sortNumbers('desc')).to.be.eql(values);
						});
				});
			});

			describe('type', () => {
				it('sorted by fee:asc should be ok', async () => {
					return transactionsEndpoint
						.makeRequest({ sort: 'type:asc', minAmount: 100 }, 200)
						.then(res => {
							expect(
								_(res.body.data)
									.map('type')
									.sortNumbers('asc'),
							).to.be.eql(_.map(res.body.data, 'type'));
						});
				});

				it('sorted by fee:desc should be ok', async () => {
					return transactionsEndpoint
						.makeRequest({ sort: 'type:desc' }, 200)
						.then(res => {
							expect(
								_(res.body.data)
									.map('type')
									.sortNumbers('desc'),
							).to.be.eql(_.map(res.body.data, 'type'));
						});
				});
			});

			it('using sort with any of sort fields should not place NULLs first', async () => {
				const transactionSortFields = [
					'amount:asc',
					'amount:desc',
					'fee:asc',
					'fee:desc',
					'type:asc',
					'type:desc',
				];

				return Promise.each(transactionSortFields, sortField => {
					return transactionsEndpoint
						.makeRequest({ sort: sortField }, 200)
						.then(res => {
							const dividedIndices = res.body.data.reduce(
								(memo, peer, index) => {
									memo[
										peer[sortField] === null ? 'nullIndices' : 'notNullIndices'
									].push(index);
									return memo;
								},
								{ notNullIndices: [], nullIndices: [] },
							);

							if (
								dividedIndices.nullIndices.length &&
								dividedIndices.notNullIndices.length
							) {
								const ascOrder = function(a, b) {
									return a - b;
								};
								dividedIndices.notNullIndices.sort(ascOrder);
								dividedIndices.nullIndices.sort(ascOrder);

								expect(
									dividedIndices.notNullIndices[
										dividedIndices.notNullIndices.length - 1
									],
								).to.be.at.most(dividedIndices.nullIndices[0]);
							}
						});
				});
			});

			it('using any other sort field should fail', async () => {
				return transactionsEndpoint
					.makeRequest({ sort: 'height:asc' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'sort');
					});
			});
		});

		describe('minAmount & maxAmount & sort', () => {
			it('using minAmount, maxAmount sorted by amount should return sorted transactions', async () => {
				return transactionsEndpoint
					.makeRequest(
						{
							minAmount,
							maxAmount,
							sort: 'amount:asc',
						},
						200,
					)
					.then(res => {
						const values = _.map(res.body.data.asset, 'amount').map(value => {
							return parseInt(value, 10);
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
			it('using valid parameters should be ok', async () => {
				return transactionsEndpoint
					.makeRequest(
						{
							senderId: accountFixtures.genesis.address,
							recipientId: account.address,
							limit: 10,
							offset: 0,
							sort: 'amount:asc',
						},
						200,
					)
					.then(res => {
						const values = _.map(res.body.data, 'amount').map(value => {
							return parseInt(value, 10);
						});
						expect(_(_.clone(values)).sortNumbers('asc')).to.be.eql(values);

						res.body.data.forEach(transaction => {
							expect(transaction.senderId).to.be.eql(
								accountFixtures.genesis.address,
							);
							expect(transaction.asset.recipientId).to.be.eql(account.address);
						});
					});
			});
		});

		describe('meta', () => {
			describe('count', () => {
				it('should return count of the transactions with response', async () => {
					return transactionsEndpoint.makeRequest({}, 200).then(res => {
						expect(res.body.meta.count).to.be.a('number');
					});
				});
			});
		});

		describe('asset', () => {
			it('assets for type 2 transactions should contain key username, publicKey and address', () => {
				return transactionsEndpoint
					.makeRequest({ type: TRANSACTION_TYPES_DELEGATE, limit: 1 }, 200)
					.then(res => {
						expect(res.body.data).to.not.empty;
						res.body.data.map(transaction => {
							return expect(transaction.asset).to.have.all.keys(
								'username',
								'publicKey',
								'address',
							);
						});
					});
			});
		});
	});
});
