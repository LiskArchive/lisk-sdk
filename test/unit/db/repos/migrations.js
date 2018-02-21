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

			it('should set peers to disconnected mode and clock to NULL for non-banned peers', function*() {
				const peer = fixtures.peers.Peer();
				peer.clock = +new Date();
				delete peer.dappid;
				delete peer.httpPort;
				delete peer.nonce;
				yield db.query(
					db.$config.pgp.helpers.insert(peer, null, { table: 'peers' })
				);

				const total = yield db.one('SELECT count(*)::int FROM peers');
				const before = yield db.one(
					'SELECT count(*)::int FROM peers WHERE state = 1 AND clock IS NULL'
				);
				yield db.migrations.applyRuntime();
				const after = yield db.one(
					'SELECT count(*)::int FROM peers WHERE state = 1 AND CLOCK IS NULL'
				);

				expect(total.count).to.be.above(0);
				expect(before.count).to.be.eql(0);
				return expect(after.count).to.be.eql(1);
			});
		});
	});
});
