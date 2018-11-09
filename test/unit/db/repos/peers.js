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

const ed = require('../../../../helpers/ed.js');
const DBSandbox = require('../../../common/db_sandbox').DBSandbox;
const peersFixtures = require('../../../fixtures').peers;
const peersSQL = require('../../../../db/sql').peers;
const seeder = require('../../../common/db_seed');

const numSeedRecords = 5;

let db;
let dbSandbox;

describe('db', () => {
	before(done => {
		dbSandbox = new DBSandbox(__testContext.config.db, 'lisk_test_db_peers');

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

	it('should initialize db.delegates repo', () => {
		return expect(db.peers).to.be.not.null;
	});

	describe('PeersRepository', () => {
		describe('constructor()', () => {
			it('should assign param and data members properly', () => {
				expect(db.peers.db).to.be.eql(db);
				expect(db.peers.pgp).to.be.eql(db.$config.pgp);
				expect(db.peers.cs).to.be.an('object');
				expect(db.peers.cs).to.have.all.keys('insert');
				return expect(db.peers.cs.insert.columns.map(c => c.name)).to.be.eql([
					'ip',
					'wsPort',
					'state',
					'height',
					'os',
					'version',
					'clock',
					'broadhash',
				]);
			});
		});

		describe('list()', () => {
			it('should use the correct SQL with no params', function*() {
				sinonSandbox.spy(db, 'any');
				yield db.peers.list();

				expect(db.any.firstCall.args[0]).to.eql(peersSQL.list);
				return expect(db.any.firstCall.args[1]).to.be.eql(undefined);
			});

			it('should return list of peers', function*() {
				const peers = [];

				// Prepare some fixture data to seed the database
				for (let i = 0; i < numSeedRecords; i++) {
					const peer = peersFixtures.DBPeer();
					const peer2 = Object.assign({}, peer);
					peer2.broadhash = ed.hexToBuffer(peer2.broadhash);
					yield db.query(
						db.$config.pgp.helpers.insert(peer2, null, { table: 'peers' })
					);
					peers.push(peer);
				}

				const result = yield db.peers.list();

				expect(result).to.be.not.empty;
				expect(result).to.have.lengthOf(numSeedRecords);
				expect(result[0]).to.have.all.keys(
					'ip',
					'wsPort',
					'state',
					'os',
					'version',
					'broadhash',
					'height',
					'clock'
				);
				return expect(result).to.be.eql(peers);
			});
		});

		describe('clear()', () => {
			it('should use the correct SQL with no params', function*() {
				sinonSandbox.spy(db, 'none');
				yield db.peers.clear();

				expect(db.none.firstCall.args[0]).to.eql(peersSQL.clear);
				return expect(db.none.firstCall.args[1]).to.be.eql(undefined);
			});

			it('should clear all peers and resolve with empty response', function*() {
				// Prepare some fixture data to seed the database
				for (let i = 0; i < 5; i++) {
					const peer = peersFixtures.DBPeer();
					peer.broadhash = ed.hexToBuffer(peer.broadhash);
					yield db.query(
						db.$config.pgp.helpers.insert(peer, null, { table: 'peers' })
					);
				}

				const before = yield db.one('SELECT count(*) from peers;');
				const result = yield db.peers.clear();
				const after = yield db.one('SELECT count(*) from peers;');

				expect(before.count).to.be.eql('5');
				expect(result).to.be.null;
				return expect(after.count).to.be.eql('0');
			});
		});

		describe('insert()', () => {
			it('should use the correct query method with correct params', function*() {
				sinonSandbox.spy(db, 'none');
				sinonSandbox.spy(db.peers.pgp.helpers, 'insert');

				const peer = peersFixtures.DBPeer();
				yield db.peers.insert(peer);

				expect(db.none).to.be.calledOnce;
				expect(db.peers.pgp.helpers.insert).to.be.calledOnce;
				return expect(db.peers.pgp.helpers.insert.firstCall.args[0]).to.be.eql(
					peer
				);
			});

			it('should insert single peer to database', function*() {
				const peer = peersFixtures.DBPeer();
				yield db.peers.insert(peer);

				const result = yield db.peers.list();

				expect(result).to.be.not.empty;
				expect(result).to.have.lengthOf(1);
				return expect(result[0]).to.be.eql(peer);
			});

			it('should insert multiple peers to database', function*() {
				const peer1 = peersFixtures.DBPeer();
				const peer2 = peersFixtures.DBPeer();
				yield db.peers.insert([peer1, peer2]);

				const result = yield db.peers.list();

				expect(result).to.be.not.empty;
				expect(result).to.have.lengthOf(2);
				return expect(result).to.be.eql([peer1, peer2]);
			});

			it('should be resolved without error if unknown attribute is provided by ignoring it', () => {
				const peer = peersFixtures.DBPeer();
				peer.unknwon = 'value';

				return expect(db.peers.insert(peer)).to.be.fulfilled;
			});

			describe('required attributes', () => {
				const peer = peersFixtures.DBPeer();

				// Broadhash has default value of null
				delete peer.broadhash;

				Object.keys(peer).forEach(attr => {
					it(`should be rejected with error if some required attribute ${attr} is not provided`, () => {
						const peer2 = Object.assign({}, peer);
						delete peer2[attr];

						return expect(db.peers.insert(peer2)).to.be.rejectedWith(
							`Property '${attr}' doesn't exist`
						);
					});
				});
			});
		});
	});
});
