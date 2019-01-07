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

const rewire = require('rewire');

const BlocksApi = rewire('../../../../modules/blocks/api.js');

describe('blocks/api', () => {
	let __private;
	let blocksApiModule;
	let library;
	let loggerSpy;
	let dbStub;
	let storageStub;
	let blockStub;
	let schemaStub;

	beforeEach(done => {
		dbStub = {
			blocks: {
				list: sinonSandbox.stub().resolves([]),
				sortFields: [
					'id',
					'timestamp',
					'height',
					'previousBlock',
					'totalAmount',
					'totalFee',
					'reward',
					'numberOfTransactions',
					'generatorPublicKey',
				],
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

		blockStub = sinonSandbox.stub();

		schemaStub = sinonSandbox.stub();

		blocksApiModule = new BlocksApi(
			loggerSpy,
			dbStub,
			storageStub,
			blockStub,
			schemaStub
		);
		library = BlocksApi.__get__('library');
		__private = BlocksApi.__get__('__private');

		done();
	});

	afterEach(done => {
		sinonSandbox.restore();
		done();
	});

	describe('constructor', () => {
		it('should assign params to library', () => {
			expect(library.logger).to.eql(loggerSpy);
			expect(library.db).to.eql(dbStub);
			expect(library.storage).to.eql(storageStub);
			expect(library.logic.block).to.eql(blockStub);
			return expect(library.schema).to.eql(schemaStub);
		});
	});

	describe('__private', () => {
		describe('list', () => {
			afterEach(done => {
				storageStub.entities.Block.get = sinonSandbox.stub().resolves([]);
				done();
			});

			describe('filters with where clauses', () => {
				it('should query storage with id param when filter.id exists', done => {
					__private.list({ id: 1 }, () => {
						expect(storageStub.entities.Block.get.args[0][0].id).to.equal(1);
						done();
					});
				});

				it('should query storage with generatorPublicKey param when filter.generatorPublicKey exists', done => {
					__private.list(
						{
							generatorPublicKey:
								'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
						},
						() => {
							expect(
								storageStub.entities.Block.get.args[0][0].generatorPublicKey
							).to.equal(
								'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f'
							);
							done();
						}
					);
				});

				it('should query storage with numberOfTransactions param when filter.numberOfTransactions exists', done => {
					__private.list({ numberOfTransactions: 2 }, () => {
						expect(
							storageStub.entities.Block.get.args[0][0].numberOfTransactions
						).to.equal(2);
						done();
					});
				});

				it('should query storage with previousBlockId param when filter.previousBlock exists', done => {
					__private.list({ previousBlock: 12345 }, () => {
						expect(
							storageStub.entities.Block.get.args[0][0].previousBlockId
						).to.equal(12345);
						done();
					});
				});

				it('should query storage with height param when filter.height >= 0', done => {
					__private.list({ height: 3 }, () => {
						expect(storageStub.entities.Block.get.args[0][0].height).to.equal(
							3
						);
						done();
					});
				});

				it('should query storage with totalAmount param when filter.totalAmount >= 0', done => {
					__private.list({ totalAmount: 4 }, () => {
						expect(
							storageStub.entities.Block.get.args[0][0].totalAmount
						).to.equal(4);
						done();
					});
				});

				it('should query storage with totalFee param when filter.totalFee >= 0', done => {
					__private.list({ totalFee: 5 }, () => {
						expect(storageStub.entities.Block.get.args[0][0].totalFee).to.equal(
							5
						);
						done();
					});
				});

				it('should query storage with reward param when filter.reward >= 0', done => {
					__private.list({ reward: 6 }, () => {
						expect(storageStub.entities.Block.get.args[0][0].reward).to.equal(
							6
						);
						done();
					});
				});
			});

			describe('filters without where clauses', () => {
				describe('limit', () => {
					it('should query storage with limit param when filter.limit exists and is number', done => {
						__private.list({ limit: 1 }, () => {
							expect(storageStub.entities.Block.get.args[0][1].limit).to.equal(
								1
							);
							done();
						});
					});

					it('should query storage with limit NaN when filter.limit exists and is not a number', done => {
						__private.list({ limit: 'test' }, () => {
							expect(storageStub.entities.Block.get.args[0][1].limit).to.be.NaN;
							done();
						});
					});

					it('should query storage with limit 100 when filter.limit does not exists', done => {
						__private.list({}, () => {
							expect(storageStub.entities.Block.get.args[0][1].limit).to.equal(
								100
							);
							done();
						});
					});

					it('should return error when filter.limit is greater than 100', done => {
						__private.list({ limit: 101 }, err => {
							expect(err).to.equal('Invalid limit. Maximum is 100');
							done();
						});
					});
				});

				describe('offset', () => {
					it('should query storage with offset param when filter.offset exists and is number', done => {
						__private.list({ offset: 10 }, () => {
							expect(storageStub.entities.Block.get.args[0][1].offset).to.equal(
								10
							);
							done();
						});
					});

					it('should query storage with offset NaN when filter.offset exists and is not a number', done => {
						__private.list({ offset: 'test' }, () => {
							expect(storageStub.entities.Block.get.args[0][1].offset).to.be
								.NaN;
							done();
						});
					});

					it('should query storage with offset 0 when filter.offset does not exist', done => {
						__private.list({}, () => {
							expect(storageStub.entities.Block.get.args[0][1].offset).to.equal(
								0
							);
							done();
						});
					});
				});

				describe('sort', () => {
					it('should query storage with sort param when filter.sort exists', done => {
						__private.list({ sort: 'numberOfTransactions:desc' }, () => {
							expect(storageStub.entities.Block.get.args[0][1].sort).to.equal(
								'numberOfTransactions:desc'
							);
							done();
						});
					});

					it('should query storage with sort height:desc when filter.sort does not exist', done => {
						__private.list({}, () => {
							expect(storageStub.entities.Block.get.args[0][1].sort).to.equal(
								'height:desc'
							);
							done();
						});
					});

					it('should return error when filter.sort is invalid', done => {
						__private.list({ sort: 'invalidField:desc' }, err => {
							expect(err).to.equal('Invalid sort field');
							done();
						});
					});
				});
			});

			describe('when db.query fails', () => {
				it('should call callback with Blocks#list error', done => {
					storageStub.entities.Block.get = sinonSandbox.stub().resolves();
					__private.list({ limit: 1 }, err => {
						expect(err).to.equal('Blocks#list error');
						done();
					});
				});
			});
		});
	});

	describe('getBlocks', () => {
		let listTemp;
		beforeEach(done => {
			listTemp = __private.list;
			__private.list = sinonSandbox.stub();
			done();
		});
		afterEach(done => {
			__private.list = listTemp;
			done();
		});
		describe('when __private.loaded = false', () => {
			before(done => {
				__private.loaded = false;
				done();
			});

			it('should call callback with error', done => {
				blocksApiModule.getBlocks({ limit: 1 }, err => {
					expect(err).to.equal('Blockchain is loading');
					done();
				});
			});
		});

		describe('when __private.loaded = true', () => {
			before(done => {
				__private.loaded = true;
				done();
			});
			describe('when filters are invalid', () => {
				beforeEach(() => {
					return __private.list.callsArgWith(
						1,
						[{ message: 'list-ERR' }],
						null
					);
				});
				it('should call callback with error', done => {
					blocksApiModule.getBlocks({ sort: 'invalidField:desc' }, err => {
						expect(err).instanceOf(Error);
						expect(err.message).to.equal('list-ERR');
						expect(err.code).to.equal(500);
						done();
					});
				});
			});
			describe('when filters are valid', () => {
				beforeEach(() => {
					return __private.list.callsArgWith(1, null, [
						{ id: '6524861224470851795' },
					]);
				});
				it('should call callback with no error', done => {
					blocksApiModule.getBlocks(
						{ id: '6524861224470851795' },
						(err, cb) => {
							expect(cb[0].id).to.equal('6524861224470851795');
							done();
						}
					);
				});
			});
		});
	});

	describe('onBind', () => {
		let modules;
		let modulesStub;

		before(done => {
			modulesStub = {
				blocks: sinonSandbox.stub(),
				system: sinonSandbox.stub(),
			};

			__private.loaded = false;

			blocksApiModule.onBind(modulesStub);
			modules = BlocksApi.__get__('modules');
			done();
		});

		it('should set __private.loaded = true', () => {
			return expect(__private.loaded).to.be.true;
		});

		describe('modules', () => {
			it('should assign blocks', () => {
				return expect(modules.blocks).to.equal(modulesStub.blocks);
			});

			it('should assign system', () => {
				return expect(modules.system).to.equal(modulesStub.system);
			});
		});
	});
});
