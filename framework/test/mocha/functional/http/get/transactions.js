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
	castVotes,
} = require('@liskhq/lisk-transactions');
const accountFixtures = require('../../../fixtures/accounts');
const randomUtil = require('../../../common/utils/random');
const waitFor = require('../../../common/utils/wait_for');
const apiHelpers = require('../../../common/helpers/api');
const SwaggerEndpoint = require('../../../common/swagger_spec');
const slots = require('../../../../../src/modules/chain/helpers/slots');
const Scenarios = require('../../../common/scenarios');

const { NORMALIZER, TRANSACTION_TYPES, FEES } = global.constants;
const expectSwaggerParamError = apiHelpers.expectSwaggerParamError;
const sendTransactionPromise = apiHelpers.sendTransactionPromise;

describe('GET /api/transactions', () => {
	const transactionsEndpoint = new SwaggerEndpoint('GET /transactions');
	const transactionList = [];

	const account = randomUtil.account();
	const account2 = randomUtil.account();
	const account3 = accountFixtures.existingDelegate;
	const accountSecondPass = randomUtil.account();
	const minAmount = 20 * NORMALIZER; // 20 LSK
	const maxAmount = 100 * NORMALIZER; // 100 LSK
	const transaction1 = transfer({
		amount: maxAmount.toString(),
		passphrase: accountFixtures.genesis.passphrase,
		recipientId: account.address,
		data: 'transaction1',
	});
	const transaction2 = transfer({
		amount: minAmount.toString(),
		passphrase: accountFixtures.genesis.passphrase,
		recipientId: account2.address,
		data: 'transaction2 ฿',
	});
	const transaction3 = transfer({
		amount: (20 * NORMALIZER).toString(), // 20 LSK
		passphrase: account.passphrase,
		recipientId: account2.address,
		data: 'hey :)',
	});
	const transaction4 = transfer({
		amount: maxAmount.toString(),
		passphrase: accountFixtures.genesis.passphrase,
		recipientId: account3.address,
		data: 'Tx4',
	});
	const transaction5 = transfer({
		amount: minAmount.toString(),
		passphrase: accountFixtures.genesis.passphrase,
		recipientId: accountSecondPass.address,
		data: 'tx 5',
	});
	const transactionType3 = castVotes({
		passphrase: account2.passphrase,
		votes: [`${accountFixtures.existingDelegate.publicKey}`],
	});
	const transactionType4 = new Scenarios.Multisig({
		amount: FEES.MULTISIGNATURE * 3,
	});
	const transactionType4Transfer = transfer({
		amount: minAmount.toString(),
		passphrase: accountFixtures.genesis.passphrase,
		recipientId: transactionType4.multiSigTransaction.senderId,
		data: 'fund acc for multisig',
	});
	const transactionType5 = {
		amount: '0',
		recipientId: '',
		senderPublicKey:
			'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
		timestamp: 68943236,
		type: 5,
		fee: '2500000000',
		asset: {
			dapp: {
				category: 4,
				name: 'Placeholder-App',
				description: 'Placeholder-App description',
				tags: 'app placeholder dummy',
				type: 0,
				link: 'https://dummy.zip',
				icon:
					'https://raw.githubusercontent.com/DummyUser/blockDataDapp/master/icon.png',
			},
		},
		signature:
			'074ad8f2fc4146c1122913a147e71b67ceccbd9a45d769b4bc9ed1cdbdf4404eaa4475f30e9ea5d33d715e3208506aee18425cf03f971d85f027e5dbc0530a02',
		id: '3173899516019557774',
	};
	const transactionType6 = {
		type: 6,
		amount: '0',
		fee: '10000000',
		recipientId: '',
		senderPublicKey:
			'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
		timestamp: 69004227,
		asset: {
			inTransfer: {
				dappId: '3173899516019557774',
			},
		},
		signature:
			'89a5d3abe53815d2cc36aaf04d242735bb8eaa767c8e8d9a31c049968189b500e87b61188a5ec80a1c191aa1bcf6bb7980f726c837fa3d3d753673ce7ab3060e',
		id: '9616264103046411489',
	};
	const transactionType7 = {
		type: 7,
		amount: '0',
		fee: '10000000',
		recipientId: '10881167371402274308L',
		senderPublicKey:
			'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
		timestamp: 69520900,
		asset: {
			outTransfer: {
				dappId: '3173899516019557774',
				transactionId: '3173899516019557774',
			},
		},
		signature:
			'8249786301f5cc7184b0681563dc5c5856568ff967bec22b778f773b0a86532b13d1ede9234f581e62388ada2d1e1366adaa03151a9e6508fb7c3a3e59425109',
		id: '18307756018345914129',
	};

	// Crediting accounts'
	before(() => {
		const promises = [];
		promises.push(apiHelpers.sendTransactionPromise(transaction1));
		promises.push(apiHelpers.sendTransactionPromise(transaction2));
		promises.push(apiHelpers.sendTransactionPromise(transaction5));
		promises.push(apiHelpers.sendTransactionPromise(transactionType4Transfer));

		return Promise.all(promises).then(() => {
			transactionList.push(transaction1);
			transactionList.push(transaction2);
			transactionList.push(transaction5);
			transactionList.push(transactionType4Transfer);

			return waitFor
				.confirmations(_.map(transactionList, 'id'))
				.then(() =>
					Promise.all([
						apiHelpers.sendTransactionPromise(transaction3),
						apiHelpers.sendTransactionPromise(transactionType3),
						apiHelpers.sendTransactionPromise(
							transactionType4.multiSigTransaction
						),
					])
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

			it('using invalid field name should fail', async () => {
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

			it('using invalid field name (x:z) should fail', async () => {
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

			it('using empty parameter should fail', async () => {
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
						return trs.id === '9314232245035524467';
					}
				);

				return transactionsEndpoint
					.makeRequest({ id: transactionInCheck.id }, 200)
					.then(res => {
						expect(res.body.data).to.not.empty;
						expect(res.body.data).to.has.length(1);

						const transaction = res.body.data[0];

						expect(transaction.id).to.be.equal(transactionInCheck.id);
						expect(transaction.type).to.be.equal(TRANSACTION_TYPES.VOTE);
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
			it('using invalid type should fail', async () => {
				const res = await transactionsEndpoint.makeRequest({ type: 8 }, 400);
				expectSwaggerParamError(res, 'type');
			});

			it('using type should be ok', async () => {
				const res = await transactionsEndpoint.makeRequest(
					{ type: TRANSACTION_TYPES.SEND },
					200
				);

				expect(res.body.data).to.not.empty;
				res.body.data.map(transaction => {
					return expect(transaction.type).to.be.equal(TRANSACTION_TYPES.SEND);
				});
			});

			describe('asset field', () => {
				it('using type 0 should return asset field with correct properties', async () => {
					const res = await transactionsEndpoint.makeRequest(
						{ type: TRANSACTION_TYPES.SEND },
						200
					);

					expect(res.body.data).to.not.empty;
					res.body.data.map(transaction =>
						expect(Object.keys(transaction.asset).length).to.be.below(2)
					);
				});

				it('using type 1 should return asset field with correct properties', async () => {
					const res = await transactionsEndpoint.makeRequest(
						{ type: TRANSACTION_TYPES.SIGNATURE },
						200
					);

					expect(res.body.data).to.not.empty;
					res.body.data.map(transaction =>
						expect(transaction.asset.signature.publicKey).to.be.a('string')
					);
				});

				it('using type 2 should return asset field with correct properties', async () => {
					const res = await transactionsEndpoint.makeRequest(
						{ type: TRANSACTION_TYPES.DELEGATE },
						200
					);

					expect(res.body.data).to.not.empty;
					res.body.data.map(transaction => {
						expect(transaction.asset.delegate).to.have.property('publicKey');
						expect(transaction.asset.delegate).to.have.property('username');
						return expect(transaction.asset.delegate).to.have.property(
							'address'
						);
					});
				});

				it('using type 3 should return asset field with correct properties', async () => {
					const res = await transactionsEndpoint.makeRequest(
						{ type: TRANSACTION_TYPES.VOTE },
						200
					);

					expect(res.body.data).to.not.empty;
					// Skip Genesis vote transaction - exception as it contains 101 votes
					const transactionsType3 = res.body.data.filter(
						transaction => transaction.recipientId !== '16313739661670634666L'
					);
					expect(transactionsType3.length).to.be.above(0);
					transactionsType3.map(transaction => {
						expect(Object.keys(transaction.asset).length).to.equal(1);
						return expect(transaction.asset.votes.length).to.be.within(1, 33);
					});
				});

				it('using type 4 should return asset field with correct properties', async () => {
					const res = await transactionsEndpoint.makeRequest(
						{ type: TRANSACTION_TYPES.MULTI },
						200
					);

					expect(res.body.data).to.not.empty;
					res.body.data.map(transaction => {
						expect(Object.keys(transaction.asset).length).to.equal(1);
						expect(transaction.asset.multisignature.min).to.be.within(1, 15); // Exception: Should be 2 for multisig
						expect(transaction.asset.multisignature.lifetime).to.be.within(
							1,
							72
						);
						expect(transaction.asset.multisignature.keysgroup).to.be.an(
							'array'
						);
						return expect(transaction.asset.multisignature.keysgroup).to.not
							.empty;
					});
				});

				it('using type 5 should return asset field with correct properties', async () => {
					const res = await transactionsEndpoint.makeRequest(
						{ type: TRANSACTION_TYPES.DAPP },
						200
					);

					expect(res.body.data).to.not.empty;
					res.body.data.map(transaction => {
						expect(Object.keys(transaction.asset).length).to.equal(1);
						// Required properties: name, category, type
						expect(transaction.asset.dapp).to.have.property('name');
						expect(transaction.asset.dapp.type).to.be.within(0, 2);
						return expect(transaction.asset.dapp.category).to.be.within(0, 9);
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
								accountFixtures.genesis.address
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
						400
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
						200
					)
					.then(res => {
						expect(res.body.data).to.not.empty;

						res.body.data.map(transaction => {
							return expect(transaction.senderPublicKey).to.be.equal(
								accountFixtures.genesis.publicKey
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
						400
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
							return expect(transaction.recipientId).to.be.equal(
								accountFixtures.genesis.address
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
						400
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
						400
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
						expect(res.body.data[1].recipientId).to.be.eql(accountId);
					});
			});
		});

		describe('recipientPublicKey', () => {
			it('using invalid recipientPublicKey should fail', async () => {
				return transactionsEndpoint
					.makeRequest({ recipientPublicKey: '' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'recipientPublicKey');
					});
			});

			it('using one recipientPublicKey should return transactions', async () => {
				return transactionsEndpoint
					.makeRequest(
						{ recipientPublicKey: accountFixtures.genesis.publicKey },
						200
					)
					.then(res => {
						expect(res.body.data).to.not.empty;

						res.body.data.map(transaction => {
							return expect(transaction.recipientPublicKey).to.be.equal(
								accountFixtures.genesis.publicKey
							);
						});
					});
			});

			it('using multiple recipientPublicKey should fail', async () => {
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
			it('using invalid blockId should fail', async () => {
				return transactionsEndpoint
					.makeRequest({ blockId: '' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'blockId');
					});
			});

			it('using one blockId should return transactions', async () => {
				const blockId = '6524861224470851795';

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
				const { body: { data: [tx] } } = await transactionsEndpoint.makeRequest(
					{ id: transaction1.id },
					200
				);
				const {
					body: { data: transactions },
				} = await transactionsEndpoint.makeRequest({ height: tx.height }, 200);

				const haveSameHeight = transactions.reduce(
					(acc, curr) => acc && curr.height === tx.height,
					true
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
							return expect(parseInt(transaction.amount)).to.be.at.least(
								minAmount
							);
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
							return expect(parseInt(transaction.amount)).to.be.at.most(
								maxAmount
							);
						});
					});
			});
		});

		describe('fromTimestamp', () => {
			it('using invalid fromTimestamp should fail', async () => {
				return transactionsEndpoint
					.makeRequest({ fromTimestamp: -1 }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'fromTimestamp');
					});
			});

			it('using valid fromTimestamp should return transactions', async () => {
				// Last hour lisk time
				const queryTime = slots.getTime() - 60 * 60;

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
			it('using invalid toTimestamp should fail', async () => {
				return transactionsEndpoint
					.makeRequest({ toTimestamp: 0 }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'toTimestamp');
					});
			});

			it('using valid toTimestamp should return transactions', async () => {
				// Current lisk time
				const queryTime = slots.getTime();

				return transactionsEndpoint
					.makeRequest({ toTimestamp: queryTime }, 200)
					.then(res => {
						res.body.data.forEach(transaction => {
							expect(transaction.timestamp).to.be.at.most(queryTime);
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
						200
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
						200
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
						200
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
						200
					)
					.then(res => {
						expect(res.body.data.length).to.greaterThan(0);
						_.map(res.body.data, transaction => {
							return expect(transaction.asset.data).to.include(
								unicodeCharacter
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
						{ height: 1, offset: 0, limit, sort: 'timestamp:desc' },
						200
					)
					.then(res => {
						lastId = res.body.data[limit - 1].id;

						return transactionsEndpoint.makeRequest(
							{ height: 1, offset: limit - 1, limit, sort: 'timestamp:desc' },
							200
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
								return parseInt(value);
							});

							expect(_(_.clone(values)).sortNumbers('asc')).to.be.eql(values);
						});
				});

				it('sorted by amount:desc should be ok', async () => {
					return transactionsEndpoint
						.makeRequest({ sort: 'amount:desc' }, 200)
						.then(res => {
							const values = _.map(res.body.data, 'amount').map(value => {
								return parseInt(value);
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
								return parseInt(value);
							});

							expect(_(_.clone(values)).sortNumbers('asc')).to.be.eql(values);
						});
				});

				it('sorted by fee:desc should be ok', async () => {
					return transactionsEndpoint
						.makeRequest({ sort: 'fee:desc' }, 200)
						.then(res => {
							const values = _.map(res.body.data, 'fee').map(value => {
								return parseInt(value);
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
									.sortNumbers('asc')
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
									.sortNumbers('desc')
							).to.be.eql(_.map(res.body.data, 'type'));
						});
				});
			});

			describe('timestamp', () => {
				it('sorted by timestamp:asc should be ok', async () => {
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

				it('sorted by timestamp:desc should be ok', async () => {
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

			it('using sort with any of sort fields should not place NULLs first', async () => {
				const transactionSortFields = [
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
							const dividedIndices = res.body.data.reduce(
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
								const ascOrder = function(a, b) {
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
						200
					)
					.then(res => {
						const values = _.map(res.body.data, 'amount').map(value => {
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
						200
					)
					.then(res => {
						const values = _.map(res.body.data, 'amount').map(value => {
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
					.makeRequest({ type: TRANSACTION_TYPES.DELEGATE, limit: 1 }, 200)
					.then(res => {
						expect(res.body.data).to.not.empty;
						res.body.data.map(transaction => {
							expect(transaction.asset).to.have.key('delegate');
							return expect(transaction.asset.delegate).to.have.all.keys(
								'username',
								'publicKey',
								'address'
							);
						});
					});
			});
		});

		describe('signature', () => {
			it('should not show signSignature when empty upon registering second passphrase', async () => {
				// Prepare
				const transaction = registerSecondPassphrase({
					passphrase: accountSecondPass.passphrase,
					secondPassphrase: accountSecondPass.secondPassphrase,
				});

				await apiHelpers.sendTransactionPromise(transaction, 200);
				await waitFor.confirmations([transaction.id]);

				// Act
				const {
					body: { data: transactions },
				} = await transactionsEndpoint.makeRequest(
					{
						type: TRANSACTION_TYPES.SIGNATURE,
						limit: 1,
						senderPublicKey: accountSecondPass.senderId,
						sort: 'timestamp:desc',
					},
					200
				);
				// Assert
				expect(transactions[0]).to.not.have.property('signSignature');
			});

			it('should show signSignature whem signing a transfer transaction with second passphrase', async () => {
				// Prepare
				const transaction = transfer({
					amount: '1',
					passphrase: accountSecondPass.passphrase,
					secondPassphrase: accountSecondPass.secondPassphrase,
					recipientId: accountFixtures.existingDelegate.address,
				});

				await sendTransactionPromise(transaction, 200);
				await waitFor.confirmations([transaction.id]);

				// Act
				const {
					body: { data: transactions },
				} = await transactionsEndpoint.makeRequest({ id: transaction.id }, 200);
				// Assert
				expect(transactions[0].signSignature).to.not.be.empty;
			});
		});

		/**
		 * This tests will fail because type 6 and type 7 transactions got disabled in Lisk Core v1.0
		 * You can make it pass locally, by changing the value for disableDappTransfer
		 * in config/default/exceptions to a value bigger than 0
		 * */
		/* eslint-disable mocha/no-skipped-tests */
		describe.skip('dapp', () => {
			before(() => {
				return sendTransactionPromise(transaction4) // send type 0 transaction
					.then(result => {
						expect(result.body.data.message).to.be.equal(
							'Transaction(s) accepted'
						);
						return waitFor.confirmations([transaction4.id]); // wait for confirmation
					})
					.then(() => {
						return sendTransactionPromise(transactionType5); // send type 5 transaction
					})
					.then(res => {
						expect(res.body.data.message).to.be.equal(
							'Transaction(s) accepted'
						);
						return waitFor.confirmations([transactionType5.id]); // wait for confirmation
					})
					.then(() => {
						return sendTransactionPromise(transactionType6); // send type 6 transaction
					})
					.then(res => {
						expect(res.body.data.message).to.be.equal(
							'Transaction(s) accepted'
						);
						return waitFor.confirmations([transactionType6.id]); // wait for confirmation
					})
					.then(() => {
						return sendTransactionPromise(transactionType7); // send type 7 transaction
					})
					.then(res => {
						expect(res.body.data.message).to.be.equal(
							'Transaction(s) accepted'
						);
						return waitFor.confirmations([transactionType7.id]); // wait for confirmation
					});
			});
			it('assets for type 6 transactions should contain key dappId', async () => {
				return transactionsEndpoint
					.makeRequest({ type: TRANSACTION_TYPES.IN_TRANSFER }, 200)
					.then(res => {
						expect(res.body.data).to.not.empty;
						res.body.data.map(transaction => {
							expect(transaction.asset).to.have.key('inTransfer');
							return expect(transaction.asset.inTransfer).to.have.key('dappId');
						});
					});
			});
			it('assets for type 7 transactions should contain key dappId and transactionId', async () => {
				return transactionsEndpoint
					.makeRequest({ type: TRANSACTION_TYPES.OUT_TRANSFER }, 200)
					.then(res => {
						expect(res.body.data).to.not.empty;
						res.body.data.map(transaction => {
							expect(transaction.asset).to.have.key('outTransfer');
							return expect(transaction.asset.outTransfer).to.have.all.keys(
								'dappId',
								'transactionId'
							);
						});
					});
			});
		});
		/* eslint-enable mocha/no-skipped-tests */
	});
});
