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

const rewire = require('rewire');
const swaggerHelper = require('../../../../../../src/modules/http_api/helpers/swagger');

const BlocksController = rewire(
	'../../../../../../src/modules/http_api/controllers/blocks',
);

describe('blocks/api', () => {
	let blockRequest;
	let library;
	let loggerSpy;
	let storageStub;
	let channelStub;
	let rawBlock;

	beforeEach(done => {
		rawBlock = {
			id: '8999789716699660339',
			payloadHash:
				'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
			generatorPublicKey:
				'68680ca0bcd4676489976837edeac305c34f652e970386013ef26e67589a2516',
			blockSignature:
				'51356c69d94762ef355a95a960002aabc80d331da136cc07082bf98856e57ea9d13d2c74dd923c412221b36f4c3e276b2d83d9019521ddf003d0b39698d4ae0a',
			height: 1860,
			totalFee: '0',
			reward: '0',
			payloadLength: 0,
			previousBlockId: '14888522644597494628',
			numberOfTransactions: 0,
			totalAmount: '0',
			timestamp: 87670360,
			version: '1',
			confirmations: 37,
		};

		blockRequest = {
			request: {
				swagger: {
					params: {
						blockId: { value: undefined },
						height: { value: undefined },
						generatorPublicKey: { value: undefined },
						fromTimestamp: { value: undefined },
						toTimestamp: { value: undefined },
						sort: { value: undefined },
						limit: { value: undefined },
						offset: { value: undefined },
					},
				},
			},
		};

		storageStub = {
			entities: {
				Block: {
					get: sinonSandbox.stub().resolves([]),
				},
			},
		};

		loggerSpy = {
			trace: sinonSandbox.spy(),
			info: sinonSandbox.spy(),
			error: sinonSandbox.spy(),
			warn: sinonSandbox.spy(),
			debug: sinonSandbox.spy(),
		};

		channelStub = sinonSandbox.stub();

		new BlocksController({
			components: { storage: storageStub, logger: loggerSpy },
			channel: channelStub,
		});

		library = BlocksController.__get__('library');
		swaggerHelper.invalidParams = sinonSandbox.stub().resolves([]);

		done();
	});

	afterEach(done => {
		sinonSandbox.restore();
		done();
	});

	describe('constructor', () => {
		it('should assign params to library', async () => {
			expect(library.logger).to.eql(loggerSpy);
			expect(library.storage).to.eql(storageStub);
			expect(library.channel).to.eql(channelStub);
		});
	});

	describe('parseBlock', () => {
		beforeEach(async () => {
			storageStub.entities.Block.get = sinonSandbox.stub().resolves([rawBlock]);
		});

		it('should return a block properly formatted when transactions is undefined', done => {
			BlocksController.getBlocks(blockRequest, (errors, { data }) => {
				expect(errors).to.eql(null);
				const block = data[0];
				expect(block).to.not.have.property('transactions');
				expect(block).to.have.property('id');
				expect(block).to.have.property('version');
				expect(block).to.have.property('timestamp');
				expect(block).to.have.property('height');
				expect(block).to.have.property('previousBlockId');
				expect(block).to.have.property('numberOfTransactions');
				expect(block).to.have.property('totalAmount');
				expect(block).to.have.property('totalFee');
				expect(block).to.have.property('reward');
				expect(block).to.have.property('payloadLength');
				expect(block).to.have.property('payloadHash');
				expect(block).to.have.property('generatorPublicKey');
				expect(block).to.have.property('generatorAddress');
				expect(block).to.have.property('blockSignature');
				expect(block).to.have.property('confirmations');
				expect(block).to.have.property('totalForged');
				expect(block).to.have.property('maxHeightPrevoted');
				expect(block).to.have.property('maxHeightPreviouslyForged');
				done();
			});
		});

		it('should return a block  formatted when transactions is undefined', done => {
			BlocksController.getBlocks(blockRequest, (errors, { meta }) => {
				expect(errors).to.eql(null);
				expect(meta).to.eql({ offset: 0, limit: 100 });
				done();
			});
		});
	});

	describe('getBlocks', () => {
		describe('getBlocks', () => {
			afterEach(done => {
				storageStub.entities.Block.get = sinonSandbox.stub().resolves([]);
				done();
			});

			describe('params with filters', () => {
				it('should query storage with id filter when params.blockId exists', done => {
					const blockId = 1;
					blockRequest.request.swagger.params.blockId.value = blockId;
					BlocksController.getBlocks(blockRequest, () => {
						expect(storageStub.entities.Block.get.args[0][0].id).to.equal(
							blockId,
						);
						done();
					});
				});

				it('should query storage with height filter when params.height exists', done => {
					const height = 3;
					blockRequest.request.swagger.params.height.value = height;
					BlocksController.getBlocks(blockRequest, () => {
						expect(storageStub.entities.Block.get.args[0][0].height).to.equal(
							height,
						);
						done();
					});
				});

				it('should query storage with generatorPublicKey filter when params.generatorPublicKey exists', done => {
					const generatorPublicKey =
						'5c554d43301786aec29a09b13b485176e81d1532347a351aeafe018c199fd7ca';
					blockRequest.request.swagger.params.generatorPublicKey.value = generatorPublicKey;
					BlocksController.getBlocks(blockRequest, () => {
						expect(
							storageStub.entities.Block.get.args[0][0].generatorPublicKey,
						).to.equal(generatorPublicKey);
						done();
					});
				});

				it('should query storage with timestamp_gte filter when params.fromTimestamp exists', done => {
					const fromTimestamp = 100;
					blockRequest.request.swagger.params.fromTimestamp.value = fromTimestamp;
					BlocksController.getBlocks(blockRequest, () => {
						expect(
							storageStub.entities.Block.get.args[0][0].timestamp_gte,
						).to.equal(fromTimestamp);
						done();
					});
				});

				it('should query storage with timestamp_lte filter when params.totalAmount exists', done => {
					const toTimestamp = 500;
					blockRequest.request.swagger.params.toTimestamp.value = toTimestamp;
					BlocksController.getBlocks(blockRequest, () => {
						expect(
							storageStub.entities.Block.get.args[0][0].timestamp_lte,
						).to.equal(toTimestamp);
						done();
					});
				});
			});

			describe('params with options', () => {
				describe('limit', () => {
					it('should query storage with limit option when params.limit exists and is a number', done => {
						const limit = 25;
						blockRequest.request.swagger.params.limit.value = limit;
						BlocksController.getBlocks(blockRequest, () => {
							expect(storageStub.entities.Block.get.args[0][1].limit).to.equal(
								limit,
							);
							done();
						});
					});

					it('should query storage with limit NaN when params.limit exists and is not a number', done => {
						const limit = 'abc';
						blockRequest.request.swagger.params.limit.value = limit;
						BlocksController.getBlocks(blockRequest, () => {
							expect(storageStub.entities.Block.get.args[0][1].limit).to.NaN;
							done();
						});
					});

					it('should query storage with limit 100 when params.limit does not exists', done => {
						const limit = 100;
						BlocksController.getBlocks(blockRequest, () => {
							expect(storageStub.entities.Block.get.args[0][1].limit).to.equal(
								limit,
							);
							done();
						});
					});
				});

				describe('offset', () => {
					it('should query storage with offset option when params.offset exists and is number', done => {
						const offset = 25;
						blockRequest.request.swagger.params.offset.value = offset;
						BlocksController.getBlocks(blockRequest, () => {
							expect(storageStub.entities.Block.get.args[0][1].offset).to.equal(
								offset,
							);
							done();
						});
					});

					it('should query storage with offset NaN when params.offset exists and is not a number', done => {
						const offset = 'abc';
						blockRequest.request.swagger.params.offset.value = offset;
						BlocksController.getBlocks(blockRequest, () => {
							expect(storageStub.entities.Block.get.args[0][1].offset).to.NaN;
							done();
						});
					});

					it('should query storage with offset 0 when params.offset does not exist', done => {
						const offset = 0;
						BlocksController.getBlocks(blockRequest, () => {
							expect(storageStub.entities.Block.get.args[0][1].offset).to.equal(
								offset,
							);
							done();
						});
					});
				});

				describe('sort', () => {
					it('should query storage with sort option when params.sort exists', done => {
						const sort = 'timestamp:asc';
						blockRequest.request.swagger.params.sort.value = sort;
						BlocksController.getBlocks(blockRequest, () => {
							expect(storageStub.entities.Block.get.args[0][1].sort).to.equal(
								sort,
							);
							done();
						});
					});

					it('should query storage with sort height:desc when params.sort does not exist', done => {
						const sort = 'height:desc';
						BlocksController.getBlocks(blockRequest, () => {
							expect(storageStub.entities.Block.get.args[0][1].sort).to.equal(
								sort,
							);
							done();
						});
					});
				});
			});

			describe('when storageStub.entities.Block.get fails', () => {
				it('should call callback with Blocks#list error', done => {
					storageStub.entities.Block.get = sinonSandbox.stub().rejects();
					BlocksController.getBlocks(blockRequest, err => {
						expect(err.message).to.equal('Blocks#list error');
						done();
					});
				});
			});
		});
	});
});
