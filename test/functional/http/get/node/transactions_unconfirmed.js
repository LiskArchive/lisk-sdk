/* eslint-disable mocha/no-skipped-tests */
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

require('../../../functional.js');
var Promise = require('bluebird');
var lisk = require('lisk-elements').default;
var apiHelpers = require('../../../../common/helpers/api');
var randomUtil = require('../../../../common/utils/random');
var swaggerEndpoint = require('../../../../common/swagger_spec');
var accountFixtures = require('../../../../fixtures/accounts');

const { NORMALIZER } = global.constants;
var expectSwaggerParamError = apiHelpers.expectSwaggerParamError;
var sendTransactionPromise = apiHelpers.sendTransactionPromise;

describe('GET /api/node', () => {
	describe('/transactions', () => {
		describe('/unconfirmed', () => {
			var UnconfirmedEndpoint = new swaggerEndpoint(
				'GET /node/transactions/{state}'
			).addParameters({ state: 'unconfirmed' });

			var account = randomUtil.account();
			var transactionList = [];
			var numOfTransactions = 5;

			before(() => {
				var data = 'extra information';

				// Create numOfTransactions transactions
				for (var i = 0; i < numOfTransactions; i++) {
					transactionList.push(
						lisk.transaction.transfer({
							amount: (i + 1) * NORMALIZER,
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
						expect(res.body.data.message).to.be.equal(
							'Transaction(s) accepted'
						);
					});
				});
			});

			describe('with wrong input', () => {
				it('using invalid field name should fail', () => {
					return UnconfirmedEndpoint.makeRequest(
						{
							whatever: accountFixtures.genesis.address,
						},
						400
					).then(res => {
						expectSwaggerParamError(res, 'whatever');
					});
				});

				it('using empty parameter should fail', () => {
					return UnconfirmedEndpoint.makeRequest(
						{
							recipientPublicKey: '',
						},
						400
					).then(res => {
						expectSwaggerParamError(res, 'recipientPublicKey');
					});
				});

				it('using completely invalid fields should fail', () => {
					return UnconfirmedEndpoint.makeRequest(
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

				it('using partially invalid fields should fail', () => {
					return UnconfirmedEndpoint.makeRequest(
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

			it('using no params should be ok', () => {
				return UnconfirmedEndpoint.makeRequest({}, 200).then(res => {
					expect(res.body.meta.count).to.be.at.least(0);
				});
			});

			describe('id', () => {
				it('using invalid id should fail', () => {
					return UnconfirmedEndpoint.makeRequest({ id: '79fjdfd' }, 400).then(
						res => {
							expectSwaggerParamError(res, 'id');
						}
					);
				});

				it('using valid but unknown id should be ok', () => {
					return UnconfirmedEndpoint.makeRequest(
						{ id: '1111111111111111' },
						200
					).then(res => {
						expect(res.body.data).to.be.empty;
					});
				});
			});

			describe('type', () => {
				it('using invalid type should fail', () => {
					return UnconfirmedEndpoint.makeRequest({ type: 8 }, 400).then(res => {
						expectSwaggerParamError(res, 'type');
					});
				});
			});

			describe('senderId', () => {
				it('using invalid senderId should fail', () => {
					return UnconfirmedEndpoint.makeRequest(
						{ senderId: '79fjdfd' },
						400
					).then(res => {
						expectSwaggerParamError(res, 'senderId');
					});
				});

				it('using valid but unknown senderId should be ok', () => {
					return UnconfirmedEndpoint.makeRequest(
						{ senderId: '1631373961111634666L' },
						200
					).then(res => {
						expect(res.body.data).to.be.empty;
					});
				});
			});

			describe('senderPublicKey', () => {
				it('using invalid senderPublicKey should fail', () => {
					return UnconfirmedEndpoint.makeRequest(
						{ senderPublicKey: '79fjdfd' },
						400
					).then(res => {
						expectSwaggerParamError(res, 'senderPublicKey');
					});
				});

				it('using valid but unknown senderPublicKey should be ok', () => {
					return UnconfirmedEndpoint.makeRequest(
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
				it('using invalid recipientId should fail', () => {
					return UnconfirmedEndpoint.makeRequest(
						{ recipientId: '79fjdfd' },
						400
					).then(res => {
						expectSwaggerParamError(res, 'recipientId');
					});
				});

				it('using valid but unknown recipientId should be ok', () => {
					return UnconfirmedEndpoint.makeRequest(
						{ recipientId: '1631373961111634666L' },
						200
					).then(res => {
						expect(res.body.data).to.be.empty;
					});
				});
			});

			describe('recipientPublicKey', () => {
				it('using invalid recipientPublicKey should fail', () => {
					return UnconfirmedEndpoint.makeRequest(
						{ recipientPublicKey: '79fjdfd' },
						400
					).then(res => {
						expectSwaggerParamError(res, 'recipientPublicKey');
					});
				});

				it('using valid but unknown recipientPublicKey should be ok', () => {
					return UnconfirmedEndpoint.makeRequest(
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
				it('using limit < 0 should fail', () => {
					return UnconfirmedEndpoint.makeRequest({ limit: -1 }, 400).then(
						res => {
							expectSwaggerParamError(res, 'limit');
						}
					);
				});

				it('using limit > 100 should fail', () => {
					return UnconfirmedEndpoint.makeRequest({ limit: 101 }, 400).then(
						res => {
							expectSwaggerParamError(res, 'limit');
						}
					);
				});

				it('using limit = 10 should be ok', () => {
					return UnconfirmedEndpoint.makeRequest({ limit: 10 }, 200).then(
						res => {
							expect(res.body).to.not.be.empty;
						}
					);
				});
			});

			describe('offset', () => {
				it('using offset="one" should fail', () => {
					return UnconfirmedEndpoint.makeRequest({ offset: 'one' }, 400).then(
						res => {
							expectSwaggerParamError(res, 'offset');
						}
					);
				});

				it('using offset=1 should be ok', () => {
					return UnconfirmedEndpoint.makeRequest(
						{ offset: 0, limit: 2 },
						200
					).then(res => {
						expect(res.body).to.not.be.empty;
					});
				});
			});

			describe('sort', () => {
				describe('amount', () => {
					it('sorted by amount:asc should be ok', () => {
						return UnconfirmedEndpoint.makeRequest(
							{ sort: 'amount:asc' },
							200
						).then(res => {
							expect(res.body).to.not.be.empty;
						});
					});

					it('sorted by amount:desc should be ok', () => {
						return UnconfirmedEndpoint.makeRequest(
							{ sort: 'amount:desc' },
							200
						).then(res => {
							expect(res.body).to.not.be.empty;
						});
					});
				});

				describe('fee', () => {
					it('sorted by fee:asc should be ok', () => {
						return UnconfirmedEndpoint.makeRequest(
							{ sort: 'fee:asc' },
							200
						).then(res => {
							expect(res.body).to.not.be.empty;
						});
					});

					it('sorted by fee:desc should be ok', () => {
						return UnconfirmedEndpoint.makeRequest(
							{ sort: 'fee:desc' },
							200
						).then(res => {
							expect(res.body).to.not.be.empty;
						});
					});
				});

				describe('type', () => {
					it('sorted by fee:asc should be ok', () => {
						return UnconfirmedEndpoint.makeRequest(
							{ sort: 'type:asc' },
							200
						).then(res => {
							expect(res.body).to.not.be.empty;
						});
					});

					it('sorted by fee:desc should be ok', () => {
						return UnconfirmedEndpoint.makeRequest(
							{ sort: 'type:desc' },
							200
						).then(res => {
							expect(res.body).to.not.be.empty;
						});
					});
				});

				describe('timestamp', () => {
					it('sorted by timestamp:asc should be ok', () => {
						return UnconfirmedEndpoint.makeRequest(
							{ sort: 'timestamp:asc' },
							200
						).then(res => {
							expect(res.body).to.not.be.empty;
						});
					});

					it('sorted by timestamp:desc should be ok', () => {
						return UnconfirmedEndpoint.makeRequest(
							{ sort: 'timestamp:desc' },
							200
						).then(res => {
							expect(res.body).to.not.be.empty;
						});
					});
				});

				it('using any other sort field should fail', () => {
					return UnconfirmedEndpoint.makeRequest({ sort: 'id:asc' }, 400).then(
						res => {
							expectSwaggerParamError(res, 'sort');
						}
					);
				});
			});
		});
	});
});
