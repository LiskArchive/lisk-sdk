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

const DBSandbox = require('../../../common/db_sandbox').DBSandbox;
const dappsSQL = require('../../../../db/sql').dapps;
const seeder = require('../../../common/db_seed');

let db;
let dbSandbox;

describe('db', () => {
	before(done => {
		dbSandbox = new DBSandbox(__testContext.config.db, 'lisk_test_db_dapps');

		dbSandbox.create((err, __db) => {
			db = __db;

			done(err);
		});
	});

	after(done => {
		dbSandbox.destroy();
		done();
	});

	beforeEach(done => {
		seeder
			.seed(db)
			.then(() => done(null))
			.catch(done);
	});

	afterEach(done => {
		sinonSandbox.restore();
		seeder
			.reset(db)
			.then(() => done(null))
			.catch(done);
	});

	it('should initialize db.accounts repo', () => {
		return expect(db.dapps).to.be.not.null;
	});

	describe('DappsRepository', () => {
		describe('constructor()', () => {
			it('should assign param and data members properly', () => {
				expect(db.dapps.db).to.be.eql(db);
				expect(db.dapps.pgp).to.be.eql(db.$config.pgp);

				expect(db.dapps.sortFields).to.be.an('array');
				return expect(db.dapps.sortFields).to.be.eql(['name']);
			});
		});

		describe('countByTransactionId()', () => {
			it('should use correct SQL file with correct params', function*() {
				sinonSandbox.spy(db, 'one');
				yield db.dapps.countByTransactionId('11111');

				expect(db.one.firstCall.args[0]).to.be.eql(
					dappsSQL.countByTransactionId
				);
				expect(db.one.firstCall.args[1]).to.be.eql('11111');
				return expect(db.one.firstCall.args[2]).to.be.a('function');
			});

			it('should resolve to an integer count with number of transactions', function*() {
				const dapps = yield seeder.seedDapps(db, 1);
				const result = yield db.dapps.countByTransactionId(dapps[0].id);

				expect(result).to.be.a('number');
				return expect(result).to.be.eql(1);
			});
		});

		describe('countByOutTransactionId()', () => {
			it('should use correct SQL file with correct params', function*() {
				sinonSandbox.spy(db, 'one');
				yield db.dapps.countByOutTransactionId('11111');

				expect(db.one.firstCall.args[0]).to.be.eql(
					dappsSQL.countByOutTransactionId
				);
				expect(db.one.firstCall.args[1]).to.be.eql('11111');
				return expect(db.one.firstCall.args[2]).to.be.a('function');
			});

			it('should resolve to an integer count with number of transactions', function*() {
				const dapps = yield seeder.seedDapps(db, 1);
				const inTransfers = yield seeder.seedInTransfer(db, dapps[0], 1);
				yield seeder.seedOutTransfer(db, dapps[0], inTransfers[0], 1);

				const result = yield db.dapps.countByOutTransactionId(
					inTransfers[0].id
				);

				expect(result).to.be.a('number');
				return expect(result).to.be.eql(1);
			});
		});

		describe('getExisting()', () => {
			it('should use correct SQL file with few params', function*() {
				sinonSandbox.spy(db, 'query');
				const params = {
					name: 'alpha',
					link: 'link_to_app',
					transactionId: '1111',
				};
				yield db.dapps.getExisting(params);

				expect(db.query.firstCall.args[0]).to.be.eql(dappsSQL.getExisting);
				return expect(db.query.firstCall.args[1]).to.be.eql(params);
			});

			it('should reject with error if required param "name" is missing', () => {
				const params = {
					// name: 'alpha',
					link: 'link_to_app',
					transactionId: '1111',
				};

				return expect(db.dapps.getExisting(params)).to.be.rejectedWith(
					"Property 'name' doesn't exist."
				);
			});

			it('should reject with error if required param "link" is missing', () => {
				const params = {
					name: 'alpha',
					// link: 'link_to_app',
					transactionId: '1111',
				};

				return expect(db.dapps.getExisting(params)).to.be.rejectedWith(
					"Property 'link' doesn't exist."
				);
			});

			it('should reject with error if required param "transactionId" is missing', () => {
				const params = {
					name: 'alpha',
					link: 'link_to_app',
					// transactionId: '1111'
				};

				return expect(db.dapps.getExisting(params)).to.be.rejectedWith(
					"Property 'transactionId' doesn't exist."
				);
			});

			it('should be resolved with empty array if dapp does not match in database', () => {
				const params = {
					name: 'alpha',
					link: 'link_to_app',
					transactionId: '1111',
				};

				return expect(db.dapps.getExisting(params)).to.be.eventually.eql([]);
			});

			it('should be resolved with proper data if dapp name matches', function*() {
				const dapp = (yield seeder.seedDapps(db, 1))[0];
				const result = yield db.dapps.getExisting({
					name: dapp.asset.dapp.name,
					link: 'Unknown',
					transactionId: '11111',
				});

				expect(result).to.not.be.null;
				expect(result).to.be.lengthOf(1);
				expect(result[0]).to.have.all.keys('name', 'link');
				expect(result[0].name).to.be.eql(dapp.asset.dapp.name);
				return expect(result[0].link).to.be.eql(dapp.asset.dapp.link);
			});

			it('should be resolved with proper data if dapp link matches', function*() {
				const dapp = (yield seeder.seedDapps(db, 1))[0];
				const result = yield db.dapps.getExisting({
					name: 'Unknown',
					link: dapp.asset.dapp.link,
					transactionId: '11111',
				});

				expect(result).to.not.be.null;
				expect(result).to.be.lengthOf(1);
				expect(result[0]).to.have.all.keys('name', 'link');
				expect(result[0].name).to.be.eql(dapp.asset.dapp.name);
				return expect(result[0].link).to.be.eql(dapp.asset.dapp.link);
			});

			it('should be resolved with empty response if existing transaction id is passed', function*() {
				const dapp = (yield seeder.seedDapps(db, 1))[0];
				const result = yield db.dapps.getExisting({
					name: dapp.asset.dapp.name,
					link: dapp.asset.dapp.link,
					transactionId: dapp.id,
				});

				return expect(result).to.be.empty;
			});
		});

		describe('list(params)', () => {
			it('should pass correct params to inline sql', function*() {
				sinonSandbox.spy(db, 'any');
				const params = {
					limit: 10,
					offset: 20,
				};
				yield db.dapps.list(params);

				expect(db.any.firstCall.args[0]).to.be.a('function');
				return expect(db.any.firstCall.args[1]).to.be.eql(params);
			});

			it('should be rejected with error if required param "limit" is not passed', () => {
				return expect(
					db.dapps.list({
						// limit: 10,
						offset: 0,
					})
				).to.be.rejectedWith("Property 'limit' doesn't exist.");
			});

			it('should be rejected with error if required param "offset" is not passed', () => {
				return expect(
					db.dapps.list({
						limit: 10,
						// offset: 0
					})
				).to.be.rejectedWith("Property 'offset' doesn't exist.");
			});

			it('should resolve if required params "limit" and "offset" is provided', () => {
				return expect(
					db.dapps.list({
						limit: 10,
						offset: 0,
					})
				).to.be.fulfilled;
			});

			it('should resolve with proper data', function*() {
				const dapp = (yield seeder.seedDapps(db, 1))[0];
				const result = yield db.dapps.list({ limit: 10, offset: 0 });

				expect(result).to.be.not.empty;
				expect(result).to.be.lengthOf(1);
				expect(result[0]).to.have.all.keys(
					'name',
					'description',
					'tags',
					'link',
					'type',
					'category',
					'icon',
					'transactionId'
				);
				expect(result[0].transactionId).to.eql(dapp.id);
				expect(result[0].name).to.eql(dapp.asset.dapp.name);
				return expect(result[0].link).to.eql(dapp.asset.dapp.link);
			});

			it('should be resolved with filtered results if param "where" is provided', function*() {
				yield seeder.seedDapps(db, 1);
				const result = yield db.dapps.list({
					limit: 10,
					offset: 0,
					where: ["name = 'Unknown'"],
				});

				return expect(result).to.be.empty;
			});

			it('should be resolved with ascending results if "sortField" and "sortMethod=ASC" are provided', function*() {
				yield seeder.seedDapps(db, 5);
				const result = yield db.dapps.list({
					limit: 10,
					offset: 0,
					sortField: 'name',
					sortMethod: 'ASC',
				});

				expect(result).to.be.lengthOf(5);
				return expect(result).to.be.eql(_.orderBy(result, 'name'));
			});

			it('should be resolved with descending results if "sortField" and "sortMethod=DESC" are provided', function*() {
				yield seeder.seedDapps(db, 5);
				const result = yield db.dapps.list({
					limit: 10,
					offset: 0,
					sortField: 'name',
					sortMethod: 'DESC',
				});

				expect(result).to.be.lengthOf(5);
				return expect(result).to.be.eql(_.orderBy(result, 'name', 'desc'));
			});

			it('should paginate the result properly', function*() {
				yield seeder.seedDapps(db, 5);
				const result1 = yield db.dapps.list({ limit: 2, offset: 0 });
				const result2 = yield db.dapps.list({ limit: 2, offset: 1 });

				expect(result1).to.be.lengthOf(2);
				expect(result2).to.be.lengthOf(2);
				return expect(result1[1]).to.be.eql(result2[0]);
			});
		});

		describe('getGenesis()', () => {
			it('should use correct SQL file with one parameter', function*() {
				sinonSandbox.spy(db, 'query');
				yield db.dapps.getGenesis('11111');

				expect(db.query.firstCall.args[0]).to.be.eql(dappsSQL.getGenesis);
				return expect(db.query.firstCall.args[1]).to.be.eql(['11111']);
			});

			it('should resolve with proper data for a valid transaction id', function*() {
				const dapp = (yield seeder.seedDapps(db, 1))[0];
				const result = yield db.dapps.getGenesis(dapp.id);

				expect(result).to.be.not.empty;
				expect(result).to.be.lengthOf(1);
				return expect(result[0]).to.be.have.all.keys(
					'height',
					'id',
					'authorId'
				);
			});

			it('should resolve with empty response for an invalid transaction id', function*() {
				const result = yield db.dapps.getGenesis('11111');

				return expect(result).to.be.empty;
			});
		});
	});
});
