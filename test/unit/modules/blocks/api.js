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

var lisk = require('lisk-js');
var application = require('../../../common/application');
var clearDatabaseTable = require('../../../common/DBSandbox').clearDatabaseTable;
var accountFixtures = require('../../../fixtures/accounts');
var randomUtil = require('../../../common/utils/random');
var rewire = require('rewire');

var modulesLoader = require('../../../common/modulesLoader');
var BlocksApi = rewire('../../../../modules/blocks/api.js');

describe('blocks/api', function () {

	var blocksApi;
	var __private;
	var dbStub;
	var blocksApiModule;

	before(function (done) {
		application.init({sandbox: {name: 'lisk_test_blocks_api'}, waitForGenesisBlock: true}, function (err, scope) {
			blocksApi = scope.modules.blocks.shared;
			blocksApi.onBind(scope.modules);

			done();
		});
	});

	describe('constructor', function () {

		var library;
		var blockStub;

		before(function (done) {
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
						'generatorPublicKey'
					]
				}
			};

			blockStub = sinonSandbox.stub();

			blocksApiModule =  new BlocksApi(modulesLoader.scope.logger, dbStub, blockStub, modulesLoader.scope.schema, modulesLoader.scope.dbSequence);
			library = BlocksApi.__get__('library');
			__private = BlocksApi.__get__('__private');

			done();
		});

		describe('library', function () {

			it('should assign logger', function () {
				expect(library.logger).to.eql(modulesLoader.scope.logger);
			});

			it('should assign db', function () {
				expect(library.db).to.eql(dbStub);
			});

			it('should assign dbSequence', function () {
				expect(library.dbSequence).to.eql(modulesLoader.scope.dbSequence);
			});

			describe('should assign logic', function () {

				it('should assign block', function () {
					expect(library.logic.block).to.eql(blockStub);
				});
			});
		});
	});

	describe('__private', function () {

		describe('list', function () {

			afterEach(function () {
				dbStub.blocks.list = sinonSandbox.stub().resolves([]);
			});

			describe('filters with where clauses', function () {

				it('should query db with id param and "b_id" = ${id} where clause when filter.id exists', function (done) {
					__private.list({id: 1}, function (err, cb) {
						expect(dbStub.blocks.list.args[0][0].id).to.equal(1);
						expect(dbStub.blocks.list.args[0][0].where[0]).to.eql('"b_id" = ${id}');
						done();
					});
				});

				it('should query db with generatorPublicKey param and "b_generatorPublicKey"::bytea = ${generatorPublicKey} where clause when filter.generatorPublicKey exists', function (done) {
					__private.list({generatorPublicKey: 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f'}, function (err, cb) {
						expect(dbStub.blocks.list.args[0][0].generatorPublicKey).to.equal('c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f');
						expect(dbStub.blocks.list.args[0][0].where[0]).to.eql('"b_generatorPublicKey"::bytea = ${generatorPublicKey}');
						done();
					});
				});

				it('should query db with numberOfTransactions param and "b_numberOfTransactions" = ${numberOfTransactions} where clause when filter.numberOfTransactions exists', function (done) {
					__private.list({numberOfTransactions: 2}, function (err, cb) {
						expect(dbStub.blocks.list.args[0][0].numberOfTransactions).to.equal(2);
						expect(dbStub.blocks.list.args[0][0].where[0]).to.eql('"b_numberOfTransactions" = ${numberOfTransactions}');
						done();
					});
				});

				it('should query db with previousBlock param and "b_previousBlock" = ${previousBlock} where clause when filter.previousBlock exists', function (done) {
					__private.list({previousBlock: 12345}, function (err, cb) {
						expect(dbStub.blocks.list.args[0][0].previousBlock).to.equal(12345);
						expect(dbStub.blocks.list.args[0][0].where[0]).to.eql('"b_previousBlock" = ${previousBlock}');
						done();
					});
				});

				it('should query db with height param and "b_height" = ${height} where clause when filter.height >= 0', function (done) {
					__private.list({height: 3}, function (err, cb) {
						expect(dbStub.blocks.list.args[0][0].height).to.equal(3);
						expect(dbStub.blocks.list.args[0][0].where[0]).to.eql('"b_height" = ${height}');
						done();
					});
				});

				it('should query db with totalAmount param and "b_totalAmount" = ${totalAmount} where clause when filter.totalAmount >= 0', function (done) {
					__private.list({totalAmount: 4}, function (err, cb) {
						expect(dbStub.blocks.list.args[0][0].totalAmount).to.equal(4);
						expect(dbStub.blocks.list.args[0][0].where[0]).to.eql('"b_totalAmount" = ${totalAmount}');
						done();
					});
				});

				it('should query db with totalFee param and "b_totalFee" = ${totalFee} where clause when filter.totalFee >= 0', function (done) {
					__private.list({totalFee: 5}, function (err, cb) {
						expect(dbStub.blocks.list.args[0][0].totalFee).to.equal(5);
						expect(dbStub.blocks.list.args[0][0].where[0]).to.eql('"b_totalFee" = ${totalFee}');
						done();
					});
				});

				it('should query db with reward param and "b_reward" = ${reward} where clause when filter.reward >= 0', function (done) {
					__private.list({reward: 6}, function (err, cb) {
						expect(dbStub.blocks.list.args[0][0].reward).to.equal(6);
						expect(dbStub.blocks.list.args[0][0].where[0]).to.eql('"b_reward" = ${reward}');
						done();
					});
				});
			});

			describe('filters without where clauses', function () {

				describe('limit', function () {

					it('should query db with limit param when filter.limit exists and is number', function (done) {
						__private.list({limit: 1}, function (err, cb) {
							expect(dbStub.blocks.list.args[0][0].limit).to.equal(1);
							done();
						});
					});

					it('should query db with limit NaN when filter.limit exists and is not a number', function (done) {
						__private.list({limit: 'test'}, function (err, cb) {
							expect(dbStub.blocks.list.args[0][0].limit).to.be.NaN;
							done();
						});
					});

					it('should query db with limit 100 when filter.limit does not exists', function (done) {
						__private.list({}, function (err, cb) {
							expect(dbStub.blocks.list.args[0][0].limit).to.equal(100);
							done();
						});
					});

					it('should return error when filter.limit is greater than 100', function (done) {
						__private.list({limit: 101}, function (err, cb) {
							expect(err).to.equal('Invalid limit. Maximum is 100');
							done();
						});
					});
				});

				describe('offset', function () {

					it('should query db with offset param when filter.offset exists and is number', function (done) {
						__private.list({offset: 10}, function (err, cb) {
							expect(dbStub.blocks.list.args[0][0].offset).to.equal(10);
							done();
						});
					});

					it('should query db with offset NaN when filter.offset exists and is not a number', function (done) {
						__private.list({offset: 'test'}, function (err, cb) {
							expect(dbStub.blocks.list.args[0][0].offset).to.be.NaN;
							done();
						});
					});

					it('should query db with offset 0 when filter.offset does not exist', function (done) {
						__private.list({}, function (err, cb) {
							expect(dbStub.blocks.list.args[0][0].offset).to.equal(0);
							done();
						});
					});
				});

				describe('sort', function () {

					it('should query db with sort param when filter.sort exists', function (done) {
						__private.list({sort: 'numberOfTransactions:desc'}, function (err, cb) {
							expect(dbStub.blocks.list.args[0][0].sortField).to.equal('"b_numberOfTransactions"');
							expect(dbStub.blocks.list.args[0][0].sortMethod).to.equal('DESC');
							done();
						});
					});

					it('should query db with sort height:desc when filter.sort does not exist', function (done) {
						__private.list({}, function (err, cb) {
							expect(dbStub.blocks.list.args[0][0].sortField).to.equal('"b_height"');
							expect(dbStub.blocks.list.args[0][0].sortMethod).to.equal('DESC');
							done();
						});
					});

					it('should return error when filter.sort is invalid', function (done) {
						__private.list({sort: 'invalidField:desc'}, function (err, cb) {
							expect(err).to.equal('Invalid sort field');
							done();
						});
					});
				});
			});

			describe('when db.query fails', function () {

				it('should call callback with Blocks#list error', function (done) {
					dbStub.blocks.list = sinonSandbox.stub().resolves();
					__private.list({limit: 1}, function (err, cb) {
						expect(err).to.equal('Blocks#list error');
						done();
					});
				});
			});
		});
	});

	describe('getBlocks', function () {

		describe('when __private.loaded = false', function () {

			before(function () {
				__private.loaded = false;
			});

			it('should call callback with error', function (done) {
				blocksApiModule.getBlocks({limit: 1}, function (err, cb) {
					expect(err).to.equal('Blockchain is loading');
					done();
				});
			});
		});

		describe('when __private.loaded = true', function () {

			it('should return data when filters are valid', function (done) {
				blocksApi.getBlocks({id: '6524861224470851795'}, function (err, cb) {
					expect(cb[0].id).to.equal('6524861224470851795');
					done();
				});
			});

			it('should return error when filters are invalid', function (done) {
				blocksApi.getBlocks({sort: 'invalidField:desc'}, function (err, cb) {
					expect(err.code).to.equal(500);
					done();
				});
			});
		});
	});

	describe('onBind', function () {

		var modules;
		var modulesStub;

		before(function () {

			modulesStub = {
				blocks: sinonSandbox.stub(),
				system: sinonSandbox.stub(),
			};

			__private.loaded = false;

			blocksApiModule.onBind(modulesStub);
			modules = BlocksApi.__get__('modules');
		});

		it('should set __private.loaded = true', function () {
			expect(__private.loaded).to.be.true;
		});

		describe('modules', function () {

			it('should assign blocks', function () {
				expect(modules.blocks).to.equal(modulesStub.blocks);
			});

			it('should assign system', function () {
				expect(modules.system).to.equal(modulesStub.system);
			});
		});
	});
});
