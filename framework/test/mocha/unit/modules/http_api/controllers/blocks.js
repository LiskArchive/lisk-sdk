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

const BlocksController = rewire(
	'../../../../../../src/modules/http_api/controllers/blocks',
);

describe('blocks/api', () => {
	let _list;
	let parseBlockFromDatabase;
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
		_list = BlocksController.__get__('_list');
		parseBlockFromDatabase = BlocksController.__get__('parseBlockFromDatabase');

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

	describe('parseBlockFromDatabase', () => {
		let formattedBlock;

		beforeEach(async () => {
			formattedBlock = parseBlockFromDatabase(rawBlock);
		});

		it('should return a block properly formatted when transactions is undefined', async () => {
			const rawBlockWithTransactions = _.cloneDeep(rawBlock);
			formattedBlock = parseBlockFromDatabase(rawBlockWithTransactions);
			expect(formattedBlock).deep.equal(formattedBlock);
			expect(formattedBlock).to.not.have.property('transactions');
		});

		it('should return a block properly formatted when transactions is not undefined', async () => {
			const rawBlockWithTransactions = _.cloneDeep(rawBlock);
			rawBlockWithTransactions.transactions = [];
			formattedBlock = parseBlockFromDatabase(rawBlockWithTransactions);
			expect(formattedBlock).to.have.property('transactions');
		});

		it('should return null when no id is present for raw data', async () => {
			const rawBlockWithoutID = _.cloneDeep(rawBlock);
			delete rawBlockWithoutID.id;
			formattedBlock = parseBlockFromDatabase(rawBlockWithoutID);
			expect(formattedBlock).to.be.null;
		});
	});

	describe('_list', () => {
		describe('list', () => {
			afterEach(done => {
				storageStub.entities.Block.get = sinonSandbox.stub().resolves([]);
				done();
			});

			describe('filters with where clauses', () => {
				it('should query storage with id param when filter.id exists', done => {
					_list({ id: 1 }, async () => {
						expect(storageStub.entities.Block.get.args[0][0].id).to.equal(1);
						done();
					});
				});

				it('should query storage with generatorPublicKey param when filter.generatorPublicKey exists', done => {
					_list(
						{
							generatorPublicKey:
								'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
						},
						async () => {
							expect(
								storageStub.entities.Block.get.args[0][0].generatorPublicKey,
							).to.equal(
								'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
							);
							done();
						},
					);
				});

				it('should query storage with numberOfTransactions param when filter.numberOfTransactions exists', done => {
					_list({ numberOfTransactions: 2 }, async () => {
						expect(
							storageStub.entities.Block.get.args[0][0].numberOfTransactions,
						).to.equal(2);
						done();
					});
				});

				it('should query storage with previousBlockId param when filter.previousBlock exists', done => {
					_list({ previousBlock: 12345 }, async () => {
						expect(
							storageStub.entities.Block.get.args[0][0].previousBlockId,
						).to.equal(12345);
						done();
					});
				});

				it('should query storage with height param when filter.height >= 0', done => {
					_list({ height: 3 }, async () => {
						expect(storageStub.entities.Block.get.args[0][0].height).to.equal(
							3,
						);
						done();
					});
				});

				it('should query storage with totalAmount param when filter.totalAmount >= 0', done => {
					_list({ totalAmount: 4 }, async () => {
						expect(
							storageStub.entities.Block.get.args[0][0].totalAmount,
						).to.equal(4);
						done();
					});
				});

				it('should query storage with totalFee param when filter.totalFee >= 0', done => {
					_list({ totalFee: 5 }, async () => {
						expect(storageStub.entities.Block.get.args[0][0].totalFee).to.equal(
							5,
						);
						done();
					});
				});

				it('should query storage with reward param when filter.reward >= 0', done => {
					_list({ reward: 6 }, async () => {
						expect(storageStub.entities.Block.get.args[0][0].reward).to.equal(
							6,
						);
						done();
					});
				});
			});

			describe('filters without where clauses', () => {
				describe('limit', () => {
					it('should query storage with limit param when filter.limit exists and is number', done => {
						_list({ limit: 1 }, async () => {
							expect(storageStub.entities.Block.get.args[0][1].limit).to.equal(
								1,
							);
							done();
						});
					});

					it('should query storage with limit NaN when filter.limit exists and is not a number', done => {
						_list({ limit: 'test' }, async () => {
							expect(storageStub.entities.Block.get.args[0][1].limit).to.be.NaN;
							done();
						});
					});

					it('should query storage with limit 100 when filter.limit does not exists', done => {
						_list({}, async () => {
							expect(storageStub.entities.Block.get.args[0][1].limit).to.equal(
								100,
							);
							done();
						});
					});

					it('should return error when filter.limit is greater than 100', done => {
						_list({ limit: 101 }, err => {
							expect(err.message).to.equal('Invalid limit. Maximum is 100');
							done();
						});
					});
				});

				describe('offset', () => {
					it('should query storage with offset param when filter.offset exists and is number', done => {
						_list({ offset: 10 }, async () => {
							expect(storageStub.entities.Block.get.args[0][1].offset).to.equal(
								10,
							);
							done();
						});
					});

					it('should query storage with offset NaN when filter.offset exists and is not a number', done => {
						_list({ offset: 'test' }, async () => {
							expect(storageStub.entities.Block.get.args[0][1].offset).to.be
								.NaN;
							done();
						});
					});

					it('should query storage with offset 0 when filter.offset does not exist', done => {
						_list({}, async () => {
							expect(storageStub.entities.Block.get.args[0][1].offset).to.equal(
								0,
							);
							done();
						});
					});
				});

				describe('sort', () => {
					it('should query storage with sort param when filter.sort exists', done => {
						_list({ sort: 'numberOfTransactions:desc' }, async () => {
							expect(storageStub.entities.Block.get.args[0][1].sort).to.equal(
								'numberOfTransactions:desc',
							);
							done();
						});
					});

					it('should query storage with sort height:desc when filter.sort does not exist', done => {
						_list({}, async () => {
							expect(storageStub.entities.Block.get.args[0][1].sort).to.equal(
								'height:desc',
							);
							done();
						});
					});

					it('should return error when filter.sort is invalid', done => {
						_list({ sort: 'invalidField:desc' }, err => {
							expect(err.message).to.equal('Invalid sort field');
							done();
						});
					});
				});
			});

			describe('when storageStub.entities.Block.get fails', () => {
				it('should call callback with Blocks#list error', done => {
					storageStub.entities.Block.get = sinonSandbox.stub().rejects();
					_list({ limit: 1 }, err => {
						expect(err.message).to.equal('Blocks#list error');
						done();
					});
				});
			});
		});
	});
});
