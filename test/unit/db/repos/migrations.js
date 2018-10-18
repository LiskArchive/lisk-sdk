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

const path = require('path');
const Promise = require('bluebird');
const fs = require('fs-extra');
const DBSandbox = require('../../../common/db_sandbox').DBSandbox;
const fixtures = require('../../../fixtures');
const migrationsSQL = require('../../../../db/sql').migrations;
const { sqlRoot } = require('../../../../db/sql/config');

let db;
let dbSandbox;

describe('db', () => {
	before(done => {
		dbSandbox = new DBSandbox(
			__testContext.config.db,
			'lisk_test_db_migrations'
		);

		dbSandbox.create((err, __db) => {
			db = __db;

			done(err);
		});
	});

	after(done => {
		dbSandbox.destroy();
		done();
	});

	afterEach(done => {
		sinonSandbox.restore();
		done();
	});

	it('should initialize db.migrations repo', () => {
		return expect(db.migrations).to.be.not.null;
	});

	describe('MigrationsRepository', () => {
		describe('constructor()', () => {
			it('should assign param and data members properly', () => {
				expect(db.migrations.db).to.be.eql(db);
				return expect(db.migrations.pgp).to.be.eql(db.$config.pgp);
			});

			it('should assign inTransaction=false when initiated outside transaction context', () => {
				return expect(db.migrations.inTransaction).to.be.eql(false);
			});

			it('should assign inTransaction=true when initiated inside transaction context', () => {
				return db.tx(t => {
					return expect(t.migrations.inTransaction).to.be.eql(true);
				});
			});
		});

		describe('hasMigrations()', () => {
			it('should call database stored procedure with correct params', function*() {
				sinonSandbox.spy(db, 'proc');
				yield db.migrations.hasMigrations();

				expect(db.proc.firstCall.args[0]).to.eql('to_regclass');
				expect(db.proc.firstCall.args[1]).to.eql('migrations');
				return expect(db.proc.firstCall.args[2]).to.be.a('function');
			});

			it('should resolve with true if migrations table exists', function*() {
				return expect(yield db.migrations.hasMigrations()).to.be.eql(true);
			});

			it('should resolve with false if migrations table does not exists', function*() {
				// Create backup table and drop migrations table
				yield db.query(
					'CREATE TABLE temp_migrations AS TABLE migrations; DROP TABLE migrations;'
				);

				expect(yield db.migrations.hasMigrations()).to.be.eql(false);

				// Restore the migrations table and drop the backup
				return yield db.query(
					'CREATE TABLE migrations AS TABLE temp_migrations; DROP TABLE temp_migrations;'
				);
			});
		});

		describe('getLastId()', () => {
			it('should use the correct SQL', function*() {
				sinonSandbox.spy(db, 'oneOrNone');
				yield db.migrations.getLastId();

				expect(db.oneOrNone.firstCall.args[0]).to.be.eql(
					migrationsSQL.getLastId
				);
				expect(db.oneOrNone.firstCall.args[1]).to.be.eql([]);
				return expect(db.oneOrNone.firstCall.args[2]).to.be.a('function');
			});

			it('should return id of the last migration file', function*() {
				const result = yield db.migrations.getLastId();
				const files = yield fs.readdir(
					path.join(sqlRoot, 'migrations', 'updates')
				);
				const fileIds = files.map(f => f.match(/(\d+)_(.+).sql/)[1]).sort();

				return expect(result).to.be.eql(parseInt(fileIds[fileIds.length - 1]));
			});
		});

		describe('applyRuntime()', () => {
			it('should use the correct SQL while in transaction context', function*() {
				return yield db.tx(function*(t) {
					sinonSandbox.spy(t, 'none');

					yield t.migrations.applyRuntime();

					return expect(t.none.firstCall.args[0]).to.be.eql(
						migrationsSQL.runtime
					);
				});
			});

			it('should start a transaction context if no transaction exists', function*() {
				sinonSandbox.spy(db, 'tx');

				yield db.migrations.applyRuntime();

				expect(db.tx.firstCall.args[0]).to.be.eql('applyRuntime');
				return expect(db.tx.firstCall.args[1]).to.be.a('function');
			});

			it('should copy mem_accounts2delegates to mem_accounts2u_delegates', function*() {
				const account = fixtures.accounts.Account();
				yield db.accounts.insert(account);
				const data = fixtures.accounts.Dependent({
					accountId: account.address,
				});

				yield db.query(
					db.$config.pgp.helpers.insert(data, null, {
						table: 'mem_accounts2delegates',
					})
				);
				yield db.migrations.applyRuntime();

				const result = yield db.query('SELECT * FROM mem_accounts2u_delegates');

				expect(result).to.have.lengthOf(1);
				return expect(result[0]).to.be.eql(data);
			});

			it('should copy mem_accounts2multisignatures to mem_accounts2u_multisignatures', function*() {
				const account = fixtures.accounts.Account();
				yield db.accounts.insert(account);
				const data = fixtures.accounts.Dependent({
					accountId: account.address,
				});

				yield db.query(
					db.$config.pgp.helpers.insert(data, null, {
						table: 'mem_accounts2multisignatures',
					})
				);
				yield db.migrations.applyRuntime();

				const result = yield db.query(
					'SELECT * FROM mem_accounts2u_multisignatures'
				);

				expect(result).to.have.lengthOf(1);
				return expect(result[0]).to.be.eql(data);
			});
		});

		describe('readPending()', () => {
			let files;
			let fileIds;

			beforeEach(function*() {
				files = yield fs.readdir(path.join(sqlRoot, 'migrations', 'updates'));
				fileIds = files.map(f => f.match(/(\d+)_(.+).sql/)[1]).sort();
				return fileIds;
			});

			it('should resolve with list of pending files if there exists any', function*() {
				const pending = (yield db.migrations.readPending(fileIds[0])).map(
					f => f.id
				);

				fileIds.splice(0, 1);
				return expect(pending).to.be.eql(fileIds);
			});

			it('should resolve with empty array if there is no pending migration', function*() {
				const pending = yield db.migrations.readPending(
					fileIds[fileIds.length - 1]
				);

				return expect(pending).to.be.empty;
			});

			it('should resolve with the list in correct format', function*() {
				const pending = yield db.migrations.readPending(fileIds[0]);

				expect(pending).to.be.an('array');
				expect(pending[0]).to.have.all.keys('id', 'name', 'path', 'file');
				return expect(pending[0].file).to.be.instanceOf(
					db.$config.pgp.QueryFile
				);
			});
		});

		describe('applyAll()', () => {
			let files;
			let fileIds;
			let fileNames;
			let updates;

			beforeEach(() => {
				return fs
					.readdir(path.join(sqlRoot, 'migrations', 'updates'))
					.then(result => {
						files = result;
						fileIds = files.map(f => f.match(/(\d+)_(.+).sql/)[1]).sort();
						fileNames = files.map(f => f.match(/(\d+)_(.+).sql/)[2]);

						return db.migrations.readPending(fileIds[0]);
					})
					.then(_updates => {
						updates = _updates;
					});
			});

			it('should apply all pending migrations in independent transactions', () => {
				const t2 = {
					none: sinonSandbox.stub().resolves(true),
				};

				const t1 = {
					migrations: {
						getLastId: sinonSandbox.stub().resolves(true),
						hasMigrations: sinonSandbox.stub().resolves(fileIds[0]),
						applyRuntime: sinonSandbox.stub().resolves(true),
						readPending: sinonSandbox.stub().resolves(updates),
					},
					tx: sinonSandbox.stub().callsArgWith(1, t2),
				};

				/**
				 * Delay the execution of resolve until callback is called.
				 *
				 * Because sinon can only call a callback or resolve to a promise,
				 * while pg-promise db.tx accepts a callback and returns a promise, and
				 * there is no way in sinon to resolve to the value returned by a callback.
				 */
				sinonSandbox
					.stub(db, 'task')
					.callsArgWith(1, t1)
					.resolves(Promise.delay(2000));

				return db.migrations.applyAll().then(() => {
					expect(db.task).to.be.calledOnce;
					expect(db.task.firstCall.args[0]).to.be.eql('migrations:applyAll');

					expect(t1.migrations.hasMigrations).to.be.calledOnce;
					expect(t1.tx).to.have.callCount(updates.length);
					updates.forEach((u, index) => {
						expect(t1.tx.getCalls()[index].args[0]).to.be.eql(
							`update:${u.name}`
						);
						expect(t1.tx.getCalls()[index].args[1]).to.be.a('function');
					});

					expect(t2.none).to.have.callCount(updates.length * 2);
					updates.forEach((u, index) => {
						expect(t2.none.getCalls()[index]).to.be.calledWithExactly(u.file);
						expect(
							t2.none.getCalls()[updates.length + index]
						).to.be.calledWithExactly(migrationsSQL.add, u);
					});
				});
			});

			it('should update migrations table with corresponding file ids and names', function*() {
				const result = yield db.query('SELECT * FROM migrations');

				expect(result).to.be.not.empty;
				return result.forEach((r, index) => {
					expect(r.id).to.be.eql(fileIds[index]);
					expect(r.name).to.be.eql(fileNames[index]);
				});
			});
		});
	});
});
