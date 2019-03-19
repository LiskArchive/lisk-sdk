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

require('../../../functional');
const Promise = require('bluebird');
const { transfer } = require('@liskhq/lisk-transactions');
const apiHelpers = require('../../../../common/helpers/api');
const randomUtil = require('../../../../common/utils/random');
const SwaggerEndpoint = require('../../../../common/swagger_spec');
const accountFixtures = require('../../../../fixtures/accounts');

const expectSwaggerParamError = apiHelpers.expectSwaggerParamError;
const sendTransactionPromise = apiHelpers.sendTransactionPromise;

describe('GET /api/node', () => {
	describe('/transactions', () => {
		describe('/unprocessed', () => {
			const UnProcessedEndpoint = new SwaggerEndpoint(
				'GET /node/transactions/{state}'
			).addParameters({ state: 'unprocessed' });

			const account = randomUtil.account();
			const transactionList = [];
			const numOfTransactions = 100;

			before(() => {
				const data = 'extra information';

				// Create numOfTransactions transactions
				for (let i = 0; i < numOfTransactions; i++) {
					transactionList.push(
						transfer({
							amount: randomUtil.number(100000000, 1000000000).toString(),
							passphrase: accountFixtures.genesis.passphrase,
							recipientId: account.address,
							data,
						})
					);
				}

				return Promise.map(transactionList, transaction => {
					return sendTransactionPromise(transaction);
				}).then(responses => {
					responses.map(res => {
						return expect(res.body.data.message).to.be.equal(
							'Transaction(s) accepted'
						);
					});
				});
			});

			describe('with wrong input', () => {
				it('using invalid field name should fail', async () => {
					return UnProcessedEndpoint.makeRequest(
						{
							whatever: accountFixtures.genesis.address,
						},
						400
					).then(res => {
						expectSwaggerParamError(res, 'whatever');
					});
				});

				it('using empty parameter should fail', async () => {
					return UnProcessedEndpoint.makeRequest(
						{
							recipientPublicKey: '',
						},
						400
					).then(res => {
						expectSwaggerParamError(res, 'recipientPublicKey');
					});
				});

				it('using completely invalid fields should fail', async () => {
					return UnProcessedEndpoint.makeRequest(
						{
							senderId: 'invalid',
							recipientId: 'invalid',
							limit: 'invalid',
							offset: 'invalid',
							sort: 'invalid',
						},
						400
					).then(res => {
						expectSwaggerParamError(res, 'senderId');
						expectSwaggerParamError(res, 'recipientId');
						expectSwaggerParamError(res, 'limit');
						expectSwaggerParamError(res, 'offset');
						expectSwaggerParamError(res, 'sort');
					});
				});

				it('using partially invalid fields should fail', async () => {
					return UnProcessedEndpoint.makeRequest(
						{
							senderId: 'invalid',
							recipientId: account.address,
							limit: 'invalid',
							offset: 'invalid',
							sort: 'invalid',
						},
						400
					).then(res => {
						expectSwaggerParamError(res, 'senderId');
						expectSwaggerParamError(res, 'limit');
						expectSwaggerParamError(res, 'offset');
						expectSwaggerParamError(res, 'sort');
					});
				});
			});

			it('using no params should be ok', async () => {
				return UnProcessedEndpoint.makeRequest({}, 200).then(res => {
					expect(res.body.meta.count).to.be.at.least(1);
				});
			});

			describe('id', () => {
				it('using invalid id should fail', async () => {
					return UnProcessedEndpoint.makeRequest({ id: '79fjdfd' }, 400).then(
						res => {
							expectSwaggerParamError(res, 'id');
						}
					);
				});

				it('using valid id should be ok', async () => {
					const transactionInCheck =
						transactionList[transactionList.length - 1];

					return UnProcessedEndpoint.makeRequest(
						{ id: transactionInCheck.id },
						200
					).then(res => {
						expect(res.body.data).to.not.empty;
						expect(res.body.data).to.has.length(1);
						expect(res.body.data[0].id).to.be.equal(transactionInCheck.id);
					});
				});

				it('using valid but unknown id should be ok', async () => {
					return UnProcessedEndpoint.makeRequest(
						{ id: '1111111111111111' },
						200
					).then(res => {
						expect(res.body.data).to.be.empty;
					});
				});
			});

			describe('type', () => {
				it('using invalid type should fail', async () => {
					return UnProcessedEndpoint.makeRequest({ type: 8 }, 400).then(res => {
						expectSwaggerParamError(res, 'type');
					});
				});

				it('using valid type should be ok @unstable', async () => {
					const transactionInCheck = transactionList[0];

					return UnProcessedEndpoint.makeRequest(
						{ type: transactionInCheck.type },
						200
					).then(res => {
						expect(res.body.data).to.not.empty;
						expect(res.body.data.length).to.be.at.least(1);
						res.body.data.map(transaction => {
							return expect(transaction.type).to.be.equal(
								transactionInCheck.type
							);
						});
					});
				});
			});

			describe('senderId', () => {
				it('using invalid senderId should fail', async () => {
					return UnProcessedEndpoint.makeRequest(
						{ senderId: '79fjdfd' },
						400
					).then(res => {
						expectSwaggerParamError(res, 'senderId');
					});
				});

				it('using valid senderId should be ok', async () => {
					return UnProcessedEndpoint.makeRequest(
						{ senderId: accountFixtures.genesis.address },
						200
					).then(res => {
						expect(res.body.data).to.not.empty;
						expect(res.body.data.length).to.be.at.least(1);
						res.body.data.map(transaction => {
							return expect(transaction.senderId).to.be.equal(
								accountFixtures.genesis.address
							);
						});
					});
				});

				it('using valid but unknown senderId should be ok', async () => {
					return UnProcessedEndpoint.makeRequest(
						{ senderId: '1631373961111634666L' },
						200
					).then(res => {
						expect(res.body.data).to.be.empty;
					});
				});
			});

			describe('senderPublicKey', () => {
				it('using invalid senderPublicKey should fail', async () => {
					return UnProcessedEndpoint.makeRequest(
						{ senderPublicKey: '79fjdfd' },
						400
					).then(res => {
						expectSwaggerParamError(res, 'senderPublicKey');
					});
				});

				it('using valid senderPublicKey should be ok', async () => {
					return UnProcessedEndpoint.makeRequest(
						{ senderPublicKey: accountFixtures.genesis.publicKey },
						200
					).then(res => {
						expect(res.body.data).to.not.empty;
						expect(res.body.data.length).to.be.at.least(1);
						res.body.data.map(transaction => {
							return expect(transaction.senderPublicKey).to.be.equal(
								accountFixtures.genesis.publicKey
							);
						});
					});
				});

				it('using valid but unknown senderPublicKey should be ok', async () => {
					return UnProcessedEndpoint.makeRequest(
						{
							senderPublicKey:
								'c094ebee7ec0c50ebeeaaaa8655e089f6e1a604b83bcaa760293c61e0f18ab6f',
						},
						200
					).then(res => {
						expect(res.body.data).to.be.empty;
					});
				});
			});

			describe('recipientId', () => {
				it('using invalid recipientId should fail', async () => {
					return UnProcessedEndpoint.makeRequest(
						{ recipientId: '79fjdfd' },
						400
					).then(res => {
						expectSwaggerParamError(res, 'recipientId');
					});
				});

				it('using valid recipientId should be ok', async () => {
					return UnProcessedEndpoint.makeRequest(
						{ recipientId: account.address },
						200
					).then(res => {
						expect(res.body.data).to.not.empty;
						expect(res.body.data.length).to.be.at.least(1);
						res.body.data.map(transaction => {
							return expect(transaction.recipientId).to.be.equal(
								account.address
							);
						});
					});
				});

				it('using valid but unknown recipientId should be ok', async () => {
					return UnProcessedEndpoint.makeRequest(
						{ recipientId: '1631373961111634666L' },
						200
					).then(res => {
						expect(res.body.data).to.be.empty;
					});
				});
			});

			describe('recipientPublicKey', () => {
				it('using invalid recipientPublicKey should fail', async () => {
					return UnProcessedEndpoint.makeRequest(
						{ recipientPublicKey: '79fjdfd' },
						400
					).then(res => {
						expectSwaggerParamError(res, 'recipientPublicKey');
					});
				});

				it('using valid recipientPublicKey should be ok', async () => {
					return UnProcessedEndpoint.makeRequest(
						{ recipientPublicKey: account.publicKey },
						200
					).then(res => {
						expect(res.body.data).to.not.empty;
						expect(res.body.data.length).to.be.at.least(1);
						res.body.data.map(transaction => {
							return expect(transaction.recipientId).to.be.equal(
								account.address
							);
						});
					});
				});

				it('using valid but unknown recipientPublicKey should be ok', async () => {
					return UnProcessedEndpoint.makeRequest(
						{
							recipientPublicKey:
								'c094ebee7ec0c50ebeeaaaa8655e089f6e1a604b83bcaa760293c61e0f18ab6f',
						},
						200
					).then(res => {
						expect(res.body.data).to.be.empty;
					});
				});
			});

			describe('limit', () => {
				it('using limit < 0 should fail', async () => {
					return UnProcessedEndpoint.makeRequest({ limit: -1 }, 400).then(
						res => {
							expectSwaggerParamError(res, 'limit');
						}
					);
				});

				it('using limit > 100 should fail', async () => {
					return UnProcessedEndpoint.makeRequest({ limit: 101 }, 400).then(
						res => {
							expectSwaggerParamError(res, 'limit');
						}
					);
				});

				it('using limit = 2 should return 2 transactions', async () => {
					return UnProcessedEndpoint.makeRequest({ limit: 2 }, 200).then(
						res => {
							expect(res.body.data).to.not.be.empty;
							expect(res.body.data.length).to.be.at.most(2);
						}
					);
				});
			});

			describe('offset @unstable', () => {
				it('using offset="one" should fail', async () => {
					return UnProcessedEndpoint.makeRequest({ offset: 'one' }, 400).then(
						res => {
							expectSwaggerParamError(res, 'offset');
						}
					);
				});

				it('using offset=1 should be ok', async () => {
					let firstTransaction = null;

					return UnProcessedEndpoint.makeRequest({ offset: 0, limit: 2 }, 200)
						.then(res => {
							firstTransaction = res.body.data[0];

							return UnProcessedEndpoint.makeRequest(
								{ offset: 1, limit: 2 },
								200
							);
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
					it('sorted by amount:asc should be ok', async () => {
						return UnProcessedEndpoint.makeRequest(
							{ sort: 'amount:asc' },
							200
						).then(res => {
							expect(res.body.data).to.not.be.empty;

							const values = _.map(res.body.data, 'amount').map(value => {
								return parseInt(value);
							});

							expect(_(_.clone(values)).sortNumbers('asc')).to.be.eql(values);
						});
					});

					it('sorted by amount:desc should be ok', async () => {
						return UnProcessedEndpoint.makeRequest(
							{ sort: 'amount:desc' },
							200
						).then(res => {
							expect(res.body.data).to.not.be.empty;

							const values = _.map(res.body.data, 'amount').map(value => {
								return parseInt(value);
							});

							expect(_(_.clone(values)).sortNumbers('desc')).to.be.eql(values);
						});
					});
				});

				describe('fee', () => {
					it('sorted by fee:asc should be ok', async () => {
						return UnProcessedEndpoint.makeRequest(
							{ sort: 'fee:asc' },
							200
						).then(res => {
							expect(res.body.data).to.not.be.empty;

							const values = _.map(res.body.data, 'fee').map(value => {
								return parseInt(value);
							});

							expect(_(_.clone(values)).sortNumbers('asc')).to.be.eql(values);
						});
					});

					it('sorted by fee:desc should be ok', async () => {
						return UnProcessedEndpoint.makeRequest(
							{ sort: 'fee:desc' },
							200
						).then(res => {
							expect(res.body.data).to.not.be.empty;

							const values = _.map(res.body.data, 'fee').map(value => {
								return parseInt(value);
							});

							expect(_(_.clone(values)).sortNumbers('desc')).to.be.eql(values);
						});
					});
				});

				describe('type', () => {
					it('sorted by fee:asc should be ok', async () => {
						return UnProcessedEndpoint.makeRequest(
							{ sort: 'type:asc' },
							200
						).then(res => {
							expect(res.body.data).to.not.be.empty;

							expect(
								_(res.body.data)
									.map('type')
									.sortNumbers('asc')
							).to.be.eql(_.map(res.body.data, 'type'));
						});
					});

					it('sorted by fee:desc should be ok', async () => {
						return UnProcessedEndpoint.makeRequest(
							{ sort: 'type:desc' },
							200
						).then(res => {
							expect(res.body.data).to.not.be.empty;

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
						return UnProcessedEndpoint.makeRequest(
							{ sort: 'timestamp:asc' },
							200
						).then(res => {
							expect(res.body.data).to.not.be.empty;

							expect(
								_(res.body.data)
									.map('timestamp')
									.sortNumbers('asc')
							).to.be.eql(_.map(res.body.data, 'timestamp'));
						});
					});

					it('sorted by timestamp:desc should be ok', async () => {
						return UnProcessedEndpoint.makeRequest(
							{ sort: 'timestamp:desc' },
							200
						).then(res => {
							expect(res.body.data).to.not.be.empty;

							expect(
								_(res.body.data)
									.map('timestamp')
									.sortNumbers('desc')
							).to.be.eql(_.map(res.body.data, 'timestamp'));
						});
					});
				});

				it('using any other sort field should fail', async () => {
					return UnProcessedEndpoint.makeRequest({ sort: 'id:asc' }, 400).then(
						res => {
							expectSwaggerParamError(res, 'sort');
						}
					);
				});
			});
		});
	});
});
