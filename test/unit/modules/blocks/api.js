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

		loggerSpy = {
			trace: sinonSandbox.spy(),
			info: sinonSandbox.spy(),
			error: sinonSandbox.spy(),
			warn: sinonSandbox.spy(),
			debug: sinonSandbox.spy(),
		};

		blockStub = sinonSandbox.stub();

		schemaStub = sinonSandbox.stub();

		blocksApiModule = new BlocksApi(loggerSpy, dbStub, blockStub, schemaStub);
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
			expect(library.logic.block).to.eql(blockStub);
			return expect(library.schema).to.eql(schemaStub);
		});
	});

	describe('__private', () => {
		describe('list', () => {
			afterEach(done => {
				dbStub.blocks.list = sinonSandbox.stub().resolves([]);
				done();
			});

			describe('filters with where clauses', () => {
				it('should query db with id param and "b_id" = ${id} where clause when filter.id exists', done => {
					__private.list({ id: 1 }, () => {
						expect(dbStub.blocks.list.args[0][0].id).to.equal(1);
						expect(dbStub.blocks.list.args[0][0].where[0]).to.eql(
							'"b_id" = ${id}'
						);
						done();
					});
				});

				it('should query db with generatorPublicKey param and "b_generatorPublicKey"::bytea = ${generatorPublicKey} where clause when filter.generatorPublicKey exists', done => {
					__private.list(
						{
							generatorPublicKey:
								'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
						},
						() => {
							expect(dbStub.blocks.list.args[0][0].generatorPublicKey).to.equal(
								'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f'
							);
							expect(dbStub.blocks.list.args[0][0].where[0]).to.eql(
								'"b_generatorPublicKey"::bytea = ${generatorPublicKey}'
							);
							done();
						}
					);
				});

				it('should query db with numberOfTransactions param and "b_numberOfTransactions" = ${numberOfTransactions} where clause when filter.numberOfTransactions exists', done => {
					__private.list({ numberOfTransactions: 2 }, () => {
						expect(dbStub.blocks.list.args[0][0].numberOfTransactions).to.equal(
							2
						);
						expect(dbStub.blocks.list.args[0][0].where[0]).to.eql(
							'"b_numberOfTransactions" = ${numberOfTransactions}'
						);
						done();
					});
				});

				it('should query db with previousBlock param and "b_previousBlock" = ${previousBlock} where clause when filter.previousBlock exists', done => {
					__private.list({ previousBlock: 12345 }, () => {
						expect(dbStub.blocks.list.args[0][0].previousBlock).to.equal(12345);
						expect(dbStub.blocks.list.args[0][0].where[0]).to.eql(
							'"b_previousBlock" = ${previousBlock}'
						);
						done();
					});
				});

				it('should query db with height param and "b_height" = ${height} where clause when filter.height >= 0', done => {
					__private.list({ height: 3 }, () => {
						expect(dbStub.blocks.list.args[0][0].height).to.equal(3);
						expect(dbStub.blocks.list.args[0][0].where[0]).to.eql(
							'"b_height" = ${height}'
						);
						done();
					});
				});

				it('should query db with totalAmount param and "b_totalAmount" = ${totalAmount} where clause when filter.totalAmount >= 0', done => {
					__private.list({ totalAmount: 4 }, () => {
						expect(dbStub.blocks.list.args[0][0].totalAmount).to.equal(4);
						expect(dbStub.blocks.list.args[0][0].where[0]).to.eql(
							'"b_totalAmount" = ${totalAmount}'
						);
						done();
					});
				});

				it('should query db with totalFee param and "b_totalFee" = ${totalFee} where clause when filter.totalFee >= 0', done => {
					__private.list({ totalFee: 5 }, () => {
						expect(dbStub.blocks.list.args[0][0].totalFee).to.equal(5);
						expect(dbStub.blocks.list.args[0][0].where[0]).to.eql(
							'"b_totalFee" = ${totalFee}'
						);
						done();
					});
				});

				it('should query db with reward param and "b_reward" = ${reward} where clause when filter.reward >= 0', done => {
					__private.list({ reward: 6 }, () => {
						expect(dbStub.blocks.list.args[0][0].reward).to.equal(6);
						expect(dbStub.blocks.list.args[0][0].where[0]).to.eql(
							'"b_reward" = ${reward}'
						);
						done();
					});
				});
			});

			describe('filters without where clauses', () => {
				describe('limit', () => {
					it('should query db with limit param when filter.limit exists and is number', done => {
						__private.list({ limit: 1 }, () => {
							expect(dbStub.blocks.list.args[0][0].limit).to.equal(1);
							done();
						});
					});

					it('should query db with limit NaN when filter.limit exists and is not a number', done => {
						__private.list({ limit: 'test' }, () => {
							expect(dbStub.blocks.list.args[0][0].limit).to.be.NaN;
							done();
						});
					});

					it('should query db with limit 100 when filter.limit does not exists', done => {
						__private.list({}, () => {
							expect(dbStub.blocks.list.args[0][0].limit).to.equal(100);
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
					it('should query db with offset param when filter.offset exists and is number', done => {
						__private.list({ offset: 10 }, () => {
							expect(dbStub.blocks.list.args[0][0].offset).to.equal(10);
							done();
						});
					});

					it('should query db with offset NaN when filter.offset exists and is not a number', done => {
						__private.list({ offset: 'test' }, () => {
							expect(dbStub.blocks.list.args[0][0].offset).to.be.NaN;
							done();
						});
					});

					it('should query db with offset 0 when filter.offset does not exist', done => {
						__private.list({}, () => {
							expect(dbStub.blocks.list.args[0][0].offset).to.equal(0);
							done();
						});
					});
				});

				describe('sort', () => {
					it('should query db with sort param when filter.sort exists', done => {
						__private.list({ sort: 'numberOfTransactions:desc' }, () => {
							expect(dbStub.blocks.list.args[0][0].sortField).to.equal(
								'"b_numberOfTransactions"'
							);
							expect(dbStub.blocks.list.args[0][0].sortMethod).to.equal('DESC');
							done();
						});
					});

					it('should query db with sort height:desc when filter.sort does not exist', done => {
						__private.list({}, () => {
							expect(dbStub.blocks.list.args[0][0].sortField).to.equal(
								'"b_height"'
							);
							expect(dbStub.blocks.list.args[0][0].sortMethod).to.equal('DESC');
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
					dbStub.blocks.list = sinonSandbox.stub().resolves();
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
