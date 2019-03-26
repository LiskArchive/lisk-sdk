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

const accountFixtures = require('../../../fixtures/accounts');
const waitFor = require('../../../common/utils/wait_for');
const SwaggerEndpoint = require('../../../common/swagger_spec');
const apiHelpers = require('../../../common/helpers/api');
const slots = require('../../../../../src/modules/chain/helpers/slots');

const expectSwaggerParamError = apiHelpers.expectSwaggerParamError;

describe('GET /blocks', () => {
	const blocksEndpoint = new SwaggerEndpoint('GET /blocks');

	// Testnet genesis block data
	const block = {
		blockHeight: 1,
		id: '6524861224470851795',
		generatorPublicKey:
			'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
		totalAmount: 10000000000000000,
		totalFee: 0,
	};

	const testBlocksUnder101 = false;

	function expectHeightCheck(res) {
		res.body.data.forEach(eachBlock => {
			if (eachBlock.height === 1) {
				expect(eachBlock.previousBlockId).to.be.empty;
			}
		});
	}

	before(() => {
		return waitFor.blocksPromise(2, null);
	});

	describe('?', () => {
		describe('blockId', () => {
			it('using invalid blockId = "InvalidId" format should fail with error', async () => {
				return blocksEndpoint
					.makeRequest({ blockId: 'InvalidId' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'blockId');
					});
			});

			it('using genesisBlock id should return the result', async () => {
				const id = '6524861224470851795';

				return blocksEndpoint.makeRequest({ blockId: id }, 200).then(res => {
					expect(res.body.data[0].id).to.equal(id);
					expectHeightCheck(res);
				});
			});

			it('using unknown id should return empty blocks array', async () => {
				return blocksEndpoint
					.makeRequest({ blockId: '9928719876370886655' }, 200)
					.then(res => {
						expect(res.body.data).to.be.empty;
						expectHeightCheck(res);
					});
			});
		});

		describe('height', () => {
			it('using invalid height = 0 should fail with error', async () => {
				return blocksEndpoint.makeRequest({ height: 0 }, 400).then(res => {
					expectSwaggerParamError(res, 'height');
				});
			});

			it('using invalid height = -1 should fail with error', async () => {
				return blocksEndpoint.makeRequest({ height: -1 }, 400).then(res => {
					expectSwaggerParamError(res, 'height');
				});
			});

			it('using correct params should be ok', async () => {
				return blocksEndpoint
					.makeRequest({ height: block.blockHeight }, 200)
					.then(res => {
						expect(res.body.data[0].height).to.equal(block.blockHeight);
						expectHeightCheck(res);
					});
			});

			it('using < 100 should be ok', function() {
				if (!testBlocksUnder101) {
					return this.skip();
				}

				return blocksEndpoint.makeRequest({ height: 10 }, 200).then(res => {
					expect(res.body.data[0].height).to.equal(10);
					expectHeightCheck(res);
				});
			});
		});

		describe('fromTimestamp', () => {
			it('using invalid fromTimestamp should fail', async () => {
				return blocksEndpoint
					.makeRequest(
						{
							fromTimestamp: -1,
						},
						400
					)
					.then(res => {
						expectSwaggerParamError(res, 'fromTimestamp');
					});
			});

			it('using valid fromTimestamp should return transactions', async () => {
				// Last hour lisk time
				const queryTime = slots.getTime() - 60 * 60;

				return blocksEndpoint
					.makeRequest(
						{
							fromTimestamp: queryTime,
						},
						200
					)
					.then(res => {
						res.body.data.forEach(transaction => {
							expect(transaction.timestamp).to.be.at.least(queryTime);
						});
					});
			});
		});

		describe('toTimestamp', () => {
			it('using invalid toTimestamp should fail', async () => {
				return blocksEndpoint
					.makeRequest(
						{
							toTimestamp: 0,
						},
						400
					)
					.then(res => {
						expectSwaggerParamError(res, 'toTimestamp');
					});
			});

			it('using valid toTimestamp should return transactions', async () => {
				// Current lisk time
				const queryTime = slots.getTime();

				return blocksEndpoint
					.makeRequest(
						{
							toTimestamp: queryTime,
						},
						200
					)
					.then(res => {
						res.body.data.forEach(transaction => {
							expect(transaction.timestamp).to.be.at.most(queryTime);
						});
					});
			});
		});

		describe('generatorPublicKey', () => {
			it('using invalid generatorPublicKey = "InvalidKey" format should fail with error', async () => {
				return blocksEndpoint
					.makeRequest({ generatorPublicKey: 'InvalidKey' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'generatorPublicKey');
					});
			});

			it('using correct params should be ok', async () => {
				return blocksEndpoint
					.makeRequest({ generatorPublicKey: block.generatorPublicKey }, 200)
					.then(res => {
						expect(res.body.data[0].generatorPublicKey).to.equal(
							block.generatorPublicKey
						);
						expectHeightCheck(res);
					});
			});
		});

		describe('sort', () => {
			describe('height', () => {
				it('using "height:asc" should be ok', async () => {
					return blocksEndpoint
						.makeRequest({ sort: 'height:asc' }, 200)
						.then(res => {
							expectHeightCheck(res);
							expect(
								_(res.body.data)
									.map('height')
									.sortNumbers()
							).to.be.eql(_.map(res.body.data, 'height'));
						});
				});

				it('using "height:desc" should be ok', async () => {
					return blocksEndpoint
						.makeRequest({ sort: 'height:desc' }, 200)
						.then(res => {
							expectHeightCheck(res);
							expect(
								_(res.body.data)
									.map('height')
									.sortNumbers('desc')
							).to.be.eql(_.map(res.body.data, 'height'));
						});
				});

				it('using empty params should sort results by descending height', async () => {
					return blocksEndpoint.makeRequest({}, 200).then(res => {
						expectHeightCheck(res);
						expect(
							_(res.body.data)
								.map('height')
								.sortNumbers('desc')
						).to.be.eql(_.map(res.body.data, 'height'));
					});
				});
			});

			describe('totalAmount', () => {
				it('using "totalAmount:asc" should be ok', async () => {
					return blocksEndpoint
						.makeRequest({ sort: 'totalAmount:asc' }, 200)
						.then(res => {
							expectHeightCheck(res);
							expect(
								_(res.body.data)
									.map('totalAmount')
									.map(_.toInteger)
									.sortNumbers()
							).to.be.eql(
								_(res.body.data)
									.map('totalAmount')
									.map(_.toInteger)
									.value()
							);
						});
				});

				it('using "totalAmount:desc" should be ok', async () => {
					return blocksEndpoint
						.makeRequest({ sort: 'totalAmount:desc' }, 200)
						.then(res => {
							expectHeightCheck(res);
							expect(
								_(res.body.data)
									.map('totalAmount')
									.map(_.toInteger)
									.sortNumbers('desc')
							).to.be.eql(
								_(res.body.data)
									.map('totalAmount')
									.map(_.toInteger)
									.value()
							);
						});
				});
			});

			describe('totalFee', () => {
				it('using "totalFee:asc" should be ok', async () => {
					return blocksEndpoint
						.makeRequest({ sort: 'totalFee:asc' }, 200)
						.then(res => {
							expectHeightCheck(res);
							expect(
								_(res.body.data)
									.map('totalFee')
									.map(_.toInteger)
									.sortNumbers()
							).to.be.eql(
								_(res.body.data)
									.map('totalFee')
									.map(_.toInteger)
									.value()
							);
						});
				});

				it('using "totalFee:desc" should be ok', async () => {
					return blocksEndpoint
						.makeRequest({ sort: 'totalFee:desc' }, 200)
						.then(res => {
							expectHeightCheck(res);
							expect(
								_(res.body.data)
									.map('totalFee')
									.map(_.toInteger)
									.sortNumbers('desc')
							).to.be.eql(
								_(res.body.data)
									.map('totalFee')
									.map(_.toInteger)
									.value()
							);
						});
				});
			});

			describe('timestamp', () => {
				it('using "timestamp:asc" should be ok', async () => {
					return blocksEndpoint
						.makeRequest({ sort: 'timestamp:asc' }, 200)
						.then(res => {
							expectHeightCheck(res);
							expect(
								_(res.body.data)
									.map('timestamp')
									.sortNumbers()
							).to.be.eql(_.map(res.body.data, 'timestamp'));
						});
				});

				it('using "timestamp:desc" should be ok', async () => {
					return blocksEndpoint
						.makeRequest({ sort: 'timestamp:desc' }, 200)
						.then(res => {
							expectHeightCheck(res);
							expect(
								_(res.body.data)
									.map('timestamp')
									.sortNumbers('desc')
							).to.be.eql(_.map(res.body.data, 'timestamp'));
						});
				});
			});
		});

		describe('limit', () => {
			it('using string should return bad request response', async () => {
				return blocksEndpoint.makeRequest({ limit: 'one' }, 400).then(res => {
					expectSwaggerParamError(res, 'limit');
				});
			});

			it('using -1 should return bad request response', async () => {
				return blocksEndpoint.makeRequest({ limit: -1 }, 400).then(res => {
					expectSwaggerParamError(res, 'limit');
				});
			});

			it('using 0 should return bad request response', async () => {
				return blocksEndpoint.makeRequest({ limit: 0 }, 400).then(res => {
					expectSwaggerParamError(res, 'limit');
				});
			});

			it('using 1 should be ok', async () => {
				return blocksEndpoint.makeRequest({ limit: 1 }, 200).then(res => {
					expect(res.body.data).to.have.length(1);
				});
			});

			it('using 100 should be ok', async () => {
				return blocksEndpoint.makeRequest({ limit: 100 }, 200).then(res => {
					expect(res.body.data.length).to.be.at.most(100);
				});
			});

			it('using > 100 should return bad request response', async () => {
				return blocksEndpoint.makeRequest({ limit: 101 }, 400).then(res => {
					expectSwaggerParamError(res, 'limit');
				});
			});
		});

		describe('offset', () => {
			it('using string should return bad request response', async () => {
				return blocksEndpoint.makeRequest({ offset: 'one' }, 400).then(res => {
					expectSwaggerParamError(res, 'offset');
				});
			});

			it('using -1 should return bad request response', async () => {
				return blocksEndpoint.makeRequest({ offset: -1 }, 400).then(res => {
					expectSwaggerParamError(res, 'offset');
				});
			});

			it('using 1 should be ok', async () => {
				// Need to wait for at least 2 blocks to be a valid test
				return blocksEndpoint.makeRequest({ offset: 1 }, 200).then(res => {
					expect(res.body.data[0].height).to.be.at.least(1);
				});
			});
		});

		describe('with wrong input', () => {
			it('using invalid field name should fail', async () => {
				return blocksEndpoint
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
				return blocksEndpoint
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
				return blocksEndpoint
					.makeRequest(
						{
							sort: '',
						},
						400
					)
					.then(res => {
						expectSwaggerParamError(res, 'sort');
					});
			});

			it('using completely invalid fields should fail', async () => {
				return blocksEndpoint
					.makeRequest(
						{
							blockId: 'invalid',
							limit: 'invalid',
							offset: 'invalid',
							sort: 'invalid',
						},
						400
					)
					.then(res => {
						expectSwaggerParamError(res, 'blockId');
						expectSwaggerParamError(res, 'limit');
						expectSwaggerParamError(res, 'offset');
						expectSwaggerParamError(res, 'sort');
					});
			});

			it('using partially invalid fields should fail', async () => {
				return blocksEndpoint
					.makeRequest(
						{
							blockId: 'invalid',
							limit: 'invalid',
							offset: 'invalid',
							sort: 'height:desc',
						},
						400
					)
					.then(res => {
						expectSwaggerParamError(res, 'blockId');
						expectSwaggerParamError(res, 'limit');
						expectSwaggerParamError(res, 'offset');
					});
			});
		});

		it('using no params should be ok', async () => {
			return blocksEndpoint.makeRequest({}, 200).then(res => {
				expect(res.body.data).to.not.empty;
			});
		});
	});
});
