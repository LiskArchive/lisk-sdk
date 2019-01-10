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
const roundsFixtures = require('../../../fixtures').rounds;
const accountsFixtures = require('../../../fixtures').accounts;
const roundsSQL = require('../../../../db/sql').rounds;
const seeder = require('../../../common/db_seed');

let db;
let dbSandbox;

describe('db', () => {
	before(done => {
		dbSandbox = new DBSandbox(__testContext.config.db, 'lisk_test_db_rounds');

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
			.then(() => done())
			.catch(done);
	});

	afterEach(done => {
		sinonSandbox.restore();
		seeder
			.reset(db)
			.then(() => done(null))
			.catch(done);
	});

	it('should initialize db.blocks repo', done => {
		expect(db.rounds).to.be.not.null;
		done();
	});

	describe('RoundsRepository', () => {
		describe('constructor()', () => {
			it('should assign param and data members properly', () => {
				expect(db.rounds.db).to.be.eql(db);
				return expect(db.rounds.pgp).to.be.eql(db.$config.pgp);
			});
		});

		describe('clearRoundSnapshot()', () => {
			it('should use the correct SQL file with no parameters', function*() {
				sinonSandbox.spy(db, 'none');
				yield db.rounds.clearRoundSnapshot();

				expect(db.none.firstCall.args[0]).to.eql(roundsSQL.clearRoundSnapshot);
				expect(db.none.firstCall.args[1]).to.eql(undefined);
				return expect(db.none).to.be.calledOnce;
			});

			it('should drop the round snapshot table if it exists', function*() {
				// Make sure the table exists
				yield db.query('CREATE TABLE mem_round_snapshot AS TABLE mem_round');

				// Check if table "mem_round_snapshot" exists
				const before = yield db.proc(
					'to_regclass',
					'mem_round_snapshot',
					a => (a ? !!a.to_regclass : false)
				);
				yield db.rounds.clearRoundSnapshot();

				// Check if table "mem_round_snapshot" exists
				const after = yield db.proc(
					'to_regclass',
					'mem_round_snapshot',
					a => (a ? !!a.to_regclass : false)
				);

				expect(before).to.be.true;
				return expect(after).to.be.false;
			});
		});

		describe('performRoundSnapshot()', () => {
			afterEach(() => {
				return db.rounds.clearRoundSnapshot();
			});

			it('should use the correct SQL file with no parameters', function*() {
				sinonSandbox.spy(db, 'none');
				yield db.rounds.performRoundSnapshot();

				expect(db.none.firstCall.args[0]).to.eql(
					roundsSQL.performRoundSnapshot
				);
				expect(db.none.firstCall.args[1]).to.eql(undefined);
				return expect(db.none).to.be.calledOnce;
			});

			it('should copy the "mem_round" table to snapshot table "mem_round_snapshot"', function*() {
				// Seed some data to mem_rounds
				const rounds = [
					new roundsFixtures.Round(),
					new roundsFixtures.Round(),
					new roundsFixtures.Round(),
				];

				yield db.query(
					db.rounds.pgp.helpers.insert(rounds[0], null, { table: 'mem_round' })
				);
				yield db.query(
					db.rounds.pgp.helpers.insert(rounds[1], null, { table: 'mem_round' })
				);
				yield db.query(
					db.rounds.pgp.helpers.insert(rounds[2], null, { table: 'mem_round' })
				);

				// Perform the snapshot
				yield db.rounds.performRoundSnapshot();

				// Load records from the snapshot table
				const result = yield db.query('SELECT * FROM mem_round_snapshot');

				return expect(result).to.be.eql(rounds);
			});

			it('should be rejected with error if snapshot table already exists', () => {
				return db.rounds.performRoundSnapshot().then(() => {
					return expect(db.rounds.performRoundSnapshot()).to.be.rejectedWith(
						'relation "mem_round_snapshot" already exists'
					);
				});
			});
		});

		describe('checkSnapshotAvailability()', () => {
			afterEach(() => {
				return db.rounds.clearRoundSnapshot();
			});

			it('should use the correct SQL file with one parameter', function*() {
				sinonSandbox.spy(db, 'oneOrNone');

				// Perform round snapshot
				yield db.rounds.performRoundSnapshot();

				yield db.rounds.checkSnapshotAvailability('1');

				expect(db.oneOrNone.firstCall.args[0]).to.eql(
					roundsSQL.checkSnapshotAvailability
				);
				expect(db.oneOrNone.firstCall.args[1]).to.eql({ round: '1' });
				return expect(db.oneOrNone).to.be.calledOnce;
			});

			it('should return 1 when snapshot for requested round is available', function*() {
				const account = new accountsFixtures.Account();

				const round1 = new roundsFixtures.Round({
					round: 1,
					delegate: account.publicKey,
				});

				yield db.query(
					db.rounds.pgp.helpers.insert(round1, null, { table: 'mem_round' })
				);

				// Perform round snapshot
				yield db.rounds.performRoundSnapshot();

				const result = yield db.rounds.checkSnapshotAvailability(round1.round);

				return expect(result).to.be.be.eql(1);
			});

			it('should return null when snapshot for requested round is not available', function*() {
				const account = new accountsFixtures.Account();

				const round1 = new roundsFixtures.Round({
					round: 1,
					delegate: account.publicKey,
				});

				yield db.query(
					db.rounds.pgp.helpers.insert(round1, null, { table: 'mem_round' })
				);

				// Perform round snapshot
				yield db.rounds.performRoundSnapshot();

				const result = yield db.rounds.checkSnapshotAvailability(
					round1.round + 1
				);

				return expect(result).to.be.be.eql(null);
			});

			it('should return null when no round number is provided', function*() {
				// Perform round snapshot
				yield db.rounds.performRoundSnapshot();

				const result = yield db.rounds.checkSnapshotAvailability();

				return expect(result).to.be.be.eql(null);
			});

			it('should reject with error if called without performing the snapshot', () => {
				return expect(
					db.rounds.checkSnapshotAvailability(1)
				).to.be.rejectedWith('relation "mem_round_snapshot" does not exist');
			});
		});

		describe('countRoundSnapshot()', () => {
			afterEach(() => {
				return db.rounds.clearRoundSnapshot();
			});

			it('should use the correct SQL file with one parameter', function*() {
				sinonSandbox.spy(db, 'one');

				// Perform round snapshot
				yield db.rounds.performRoundSnapshot();

				yield db.rounds.countRoundSnapshot();

				expect(db.one.firstCall.args[0]).to.eql(roundsSQL.countRoundSnapshot);
				expect(db.one.firstCall.args[1]).to.eql([]);
				return expect(db.one).to.be.calledOnce;
			});

			it('should return proper number of records when table is not empty', function*() {
				// Seed some data to mem_rounds
				const rounds = [
					new roundsFixtures.Round(),
					new roundsFixtures.Round(),
					new roundsFixtures.Round(),
				];

				yield db.query(
					db.rounds.pgp.helpers.insert(rounds[0], null, { table: 'mem_round' })
				);
				yield db.query(
					db.rounds.pgp.helpers.insert(rounds[1], null, { table: 'mem_round' })
				);
				yield db.query(
					db.rounds.pgp.helpers.insert(rounds[2], null, { table: 'mem_round' })
				);

				// Perform round snapshot
				yield db.rounds.performRoundSnapshot();

				const count = yield db.rounds.countRoundSnapshot();

				expect(count).to.be.an('number');
				return expect(count).to.be.eql(rounds.length);
			});

			it('should return 0 when table is empty', function*() {
				// Perform round snapshot
				yield db.rounds.performRoundSnapshot();

				const count = yield db.rounds.countRoundSnapshot();

				expect(count).to.be.an('number');
				return expect(count).to.be.eql(0);
			});

			it('should reject with error if called without performing the snapshot', () => {
				return expect(db.rounds.countRoundSnapshot()).to.be.rejectedWith(
					'relation "mem_round_snapshot" does not exist'
				);
			});
		});

		describe('getDelegatesSnapshot()', () => {
			afterEach(() => {
				return db.rounds.clearVotesSnapshot();
			});

			it('should reject with error if the called without performing the snapshot', () => {
				return expect(db.rounds.getDelegatesSnapshot(10)).to.be.rejectedWith(
					'relation "mem_votes_snapshot" does not exist'
				);
			});

			it('should use the correct SQL file with one parameter', function*() {
				// Perform the snapshot first
				yield db.rounds.performVotesSnapshot();

				sinonSandbox.spy(db, 'query');
				yield db.rounds.getDelegatesSnapshot(10);

				expect(db.query.firstCall.args[0]).to.eql(
					roundsSQL.getDelegatesSnapshot
				);
				expect(db.query.firstCall.args[1]).to.eql([10]);
				return expect(db.query).to.be.calledOnce;
			});

			it('should return snapshot records in valid format', function*() {
				// Seed some account
				const account = new accountsFixtures.Account({
					isDelegate: true,
				});
				yield db.accounts.insert(account);

				// Perform the snapshot first
				yield db.rounds.performVotesSnapshot();

				const result = yield db.rounds.getDelegatesSnapshot(2);

				expect(result).to.be.not.empty;
				expect(result).to.be.an('array');
				return expect(result[0]).to.have.all.keys('publicKey');
			});

			it('should return snapshot records in valid order', function*() {
				// Seed some account
				const account1 = new accountsFixtures.Account({
					isDelegate: true,
				});
				const account2 = new accountsFixtures.Account({
					isDelegate: true,
				});
				const account3 = new accountsFixtures.Account({
					isDelegate: true,
				});
				const accounts = [account1, account2, account3];
				yield db.accounts.insert(account1);
				yield db.accounts.insert(account2);
				yield db.accounts.insert(account3);

				// Perform the snapshot first
				yield db.rounds.performVotesSnapshot();

				const result = yield db.rounds.getDelegatesSnapshot(3);

				return expect(
					result.map(r => Buffer.from(r.publicKey).toString('hex'))
				).to.be.eql(
					_.orderBy(accounts, ['vote', 'publicKey'], ['desc', 'asc']).map(
						r => r.publicKey
					)
				);
			});

			it('should return snapshot records with provided limit', function*() {
				// Seed some account
				const account1 = new accountsFixtures.Account({
					isDelegate: true,
				});
				const account2 = new accountsFixtures.Account({
					isDelegate: true,
				});
				const account3 = new accountsFixtures.Account({
					isDelegate: true,
				});
				yield db.accounts.insert(account1);
				yield db.accounts.insert(account2);
				yield db.accounts.insert(account3);

				// Perform the snapshot first
				yield db.rounds.performVotesSnapshot();

				const result = yield db.rounds.getDelegatesSnapshot(2);

				return expect(result).to.have.lengthOf(2);
			});
		});

		describe('clearVotesSnapshot()', () => {
			it('should use the correct SQL file with no parameters', function*() {
				sinonSandbox.spy(db, 'none');
				yield db.rounds.clearVotesSnapshot();

				expect(db.none.firstCall.args[0]).to.eql(roundsSQL.clearVotesSnapshot);
				expect(db.none.firstCall.args[1]).to.eql(undefined);
				return expect(db.none).to.be.calledOnce;
			});

			it('should drop the votes snapshot table if it exists', function*() {
				// Make sure the table exists
				yield db.query('CREATE TABLE mem_votes_snapshot AS TABLE mem_accounts');

				// Check if table "mem_round_snapshot" exists
				const before = yield db.proc(
					'to_regclass',
					'mem_votes_snapshot',
					a => (a ? !!a.to_regclass : false)
				);
				yield db.rounds.clearVotesSnapshot();

				// Check if table "mem_round_snapshot" exists
				const after = yield db.proc(
					'to_regclass',
					'mem_votes_snapshot',
					a => (a ? !!a.to_regclass : false)
				);

				expect(before).to.be.true;
				return expect(after).to.be.false;
			});
		});

		describe('performVotesSnapshot()', () => {
			afterEach(() => {
				return db.rounds.clearVotesSnapshot();
			});

			it('should use the correct SQL file with no parameters', function*() {
				sinonSandbox.spy(db, 'none');
				yield db.rounds.performVotesSnapshot();

				expect(db.none.firstCall.args[0]).to.eql(
					roundsSQL.performVotesSnapshot
				);
				expect(db.none.firstCall.args[1]).to.eql(undefined);
				return expect(db.none).to.be.calledOnce;
			});

			it('should copy the "address", "publicKey", "vote", "producedBlocks", "missedBlocks" from table "mem_accounts" to snapshot table "mem_votes_snapshot" for delegates', function*() {
				// Seed some account
				const account1 = new accountsFixtures.Account({
					isDelegate: true,
				});
				const account2 = new accountsFixtures.Account({
					isDelegate: true,
				});
				const account3 = new accountsFixtures.Account({
					isDelegate: false,
				});
				const delegates = [account1, account2];
				yield db.accounts.insert(account1);
				yield db.accounts.insert(account2);
				yield db.accounts.insert(account3);

				// Perform the snapshot
				yield db.rounds.performVotesSnapshot();

				// Load records from the snapshot table
				const result = yield db.query(
					'SELECT *, encode("publicKey", \'hex\') as "publicKey" FROM mem_votes_snapshot'
				);

				expect(result).to.be.not.empty;

				// As we there were only 2 delegates accounts
				expect(result).to.have.lengthOf(2);
				return expect(result).to.have.deep.members(
					delegates.map(d => {
						return {
							publicKey: d.publicKey,
							address: d.address,
							vote: d.vote,
							producedBlocks: d.producedBlocks,
							missedBlocks: d.missedBlocks,
						};
					})
				);
			});

			it('should be rejected with error if snapshot table already exists', () => {
				return db.rounds.performVotesSnapshot().then(() => {
					return expect(db.rounds.performVotesSnapshot()).to.be.rejectedWith(
						'relation "mem_votes_snapshot" already exists'
					);
				});
			});
		});

		describe('restoreRoundSnapshot()', () => {
			afterEach(() => {
				return db.rounds.clearRoundSnapshot();
			});

			it('should reject with error if the called without performing the snapshot', () => {
				return expect(db.rounds.restoreRoundSnapshot()).to.be.rejectedWith(
					'relation "mem_round_snapshot" does not exist'
				);
			});

			it('should use the correct SQL file with no parameters', function*() {
				// Perform the snapshot first
				yield db.rounds.performRoundSnapshot();

				sinonSandbox.spy(db, 'none');
				yield db.rounds.restoreRoundSnapshot();

				expect(db.none.firstCall.args[0]).to.eql(
					roundsSQL.restoreRoundSnapshot
				);
				expect(db.none.firstCall.args[1]).to.eql(undefined);
				return expect(db.none).to.be.calledOnce;
			});

			it('should restore round snapshot to "mem_round" table', function*() {
				// Seed some data to mem_rounds
				const rounds = [
					new roundsFixtures.Round(),
					new roundsFixtures.Round(),
					new roundsFixtures.Round(),
				];

				yield db.query(
					db.rounds.pgp.helpers.insert(rounds[0], null, { table: 'mem_round' })
				);
				yield db.query(
					db.rounds.pgp.helpers.insert(rounds[1], null, { table: 'mem_round' })
				);
				yield db.query(
					db.rounds.pgp.helpers.insert(rounds[2], null, { table: 'mem_round' })
				);

				// Perform the snapshot
				yield db.rounds.performRoundSnapshot();

				// Delete the records from round table
				yield db.query('DELETE FROM mem_round');

				const before = yield db.query('SELECT * FROM mem_round');
				// Restore the snapshot
				yield db.rounds.restoreRoundSnapshot();
				const after = yield db.query('SELECT * FROM mem_round');

				expect(before).to.have.lengthOf(0);
				expect(after).to.have.lengthOf(3);
				return expect(after).to.be.eql(rounds);
			});
		});

		describe('restoreVotesSnapshot()', () => {
			afterEach(() => {
				return db.rounds.clearVotesSnapshot();
			});

			it('should reject with error if the called without performing the snapshot', () => {
				return expect(db.rounds.restoreVotesSnapshot()).to.be.rejectedWith(
					'relation "mem_votes_snapshot" does not exist'
				);
			});

			it('should use the correct SQL file with no parameters', function*() {
				// Perform the snapshot first
				yield db.rounds.performVotesSnapshot();

				sinonSandbox.spy(db, 'none');
				yield db.rounds.restoreVotesSnapshot();

				expect(db.none.firstCall.args[0]).to.eql(
					roundsSQL.restoreVotesSnapshot
				);
				expect(db.none.firstCall.args[1]).to.eql(undefined);
				return expect(db.none).to.be.calledOnce;
			});

			it('should update vote information to "mem_accounts" table from snapshot', function*() {
				// Seed some account
				const account1 = new accountsFixtures.Account({
					isDelegate: true,
				});
				const account2 = new accountsFixtures.Account({
					isDelegate: true,
				});
				const account3 = new accountsFixtures.Account({
					isDelegate: true,
				});
				const accounts = [account1, account2, account3];
				const addresses = accounts.map(a => a.address);
				yield db.accounts.insert(account1);
				yield db.accounts.insert(account2);
				yield db.accounts.insert(account3);

				// Perform the snapshot
				yield db.rounds.performVotesSnapshot();

				// Update mem_accounts and set vote to dummy value
				yield db.query(
					'UPDATE mem_accounts SET vote = $1 WHERE address IN ($2:csv)',
					[0, addresses]
				);

				const before = yield db.query(
					'SELECT address, vote FROM mem_accounts WHERE address IN ($1:csv)',
					[addresses]
				);
				// Restore the snapshot
				yield db.rounds.restoreVotesSnapshot();
				const after = yield db.query(
					'SELECT address, vote FROM mem_accounts WHERE address IN ($1:csv)',
					[addresses]
				);

				expect(before.map(a => a.vote)).to.be.eql(['0', '0', '0']);
				return accounts.forEach(account => {
					expect(_.find(after, { address: account.address }).vote).to.be.eql(
						account.vote
					);
				});
			});
		});

		describe('insertRoundInformationWithAmount()', () => {
			it('should use the correct SQL file with four parameters', function*() {
				sinonSandbox.spy(db, 'none');
				const params = {
					address: '123L',
					amount: '456',
					round: 1,
				};
				yield db.rounds.insertRoundInformationWithAmount(
					params.address,
					params.round,
					params.amount
				);

				expect(db.none.firstCall.args[0]).to.eql(
					roundsSQL.insertRoundInformationWithAmount
				);
				expect(db.none.firstCall.args[1]).to.eql(params);
				return expect(db.none).to.be.calledOnce;
			});

			it('should not insert any record for an invalid address', function*() {
				const params = {
					address: '123L',
					amount: '456',
					round: 1,
				};
				yield db.rounds.insertRoundInformationWithAmount(
					params.address,
					params.round,
					params.amount
				);

				const result = yield db.query('SELECT * FROM mem_round');

				return expect(result).to.have.lengthOf(0);
			});

			it('should insert one record to "mem_round" for valid parameters', function*() {
				// Prepare an account first
				const account = new accountsFixtures.Account({
					isDelegate: true,
				});
				const delegate = '12345678';
				yield db.accounts.insert(account);
				yield db.query(
					`INSERT INTO mem_accounts2delegates ("accountId", "dependentId") VALUES('${
						account.address
					}', '${delegate}')`
				);

				const params = {
					address: account.address,
					amount: '456',
					round: 1,
				};
				yield db.rounds.insertRoundInformationWithAmount(
					params.address,
					params.round,
					params.amount
				);
				params.delegate = delegate;

				const result = yield db.query('SELECT * FROM mem_round');

				expect(result).to.have.lengthOf(1);
				return expect(result[0]).to.be.eql(params);
			});
		});

		describe('insertRoundInformationWithDelegate()', () => {
			it('should use the correct SQL file with five parameters', function*() {
				sinonSandbox.spy(db, 'none');
				const params = {
					address: '123L',
					round: 1,
					delegate: '456',
					balanceMode: '-',
				};
				yield db.rounds.insertRoundInformationWithDelegate(
					params.address,
					params.round,
					params.delegate,
					params.balanceMode
				);

				expect(db.none.firstCall.args[0]).to.eql(
					roundsSQL.insertRoundInformationWithDelegate
				);
				expect(db.none.firstCall.args[1]).to.eql(params);
				return expect(db.none).to.be.calledOnce;
			});

			it('should not insert any record for an invalid address', function*() {
				const params = {
					address: '123L',
					round: 1,
					delegate: '456',
					balanceMode: '-',
				};
				yield db.rounds.insertRoundInformationWithDelegate(
					params.address,
					params.round,
					params.delegate,
					params.balanceMode
				);

				const result = yield db.query('SELECT * FROM mem_round');

				return expect(result).to.have.lengthOf(0);
			});

			it('should insert one record to "mem_round" for valid parameters with negative balance mode', function*() {
				// Prepare an account first
				const account = new accountsFixtures.Account({
					isDelegate: true,
					balance: '100',
				});
				yield db.accounts.insert(account);
				const round = 1;
				const delegate = '4567';
				const balanceMode = '-';

				yield db.rounds.insertRoundInformationWithDelegate(
					account.address,
					round,
					delegate,
					balanceMode
				);

				const result = yield db.query('SELECT * FROM mem_round');

				expect(result).to.have.lengthOf(1);
				return expect(result[0]).to.be.eql({
					address: account.address,
					round,
					delegate,
					amount: balanceMode + account.balance,
				});
			});

			it('should insert one record to "mem_round" for valid parameters with positive balance mode', function*() {
				// Prepare an account first
				const account = new accountsFixtures.Account({
					isDelegate: true,
					balance: '100',
				});
				yield db.accounts.insert(account);
				const round = 1;
				const delegate = '4567';
				const balanceMode = '+';

				yield db.rounds.insertRoundInformationWithDelegate(
					account.address,
					round,
					delegate,
					balanceMode
				);

				const result = yield db.query('SELECT * FROM mem_round');

				expect(result).to.have.lengthOf(1);
				return expect(result[0]).to.be.eql({
					address: account.address,
					round,
					delegate,
					amount: account.balance,
				});
			});

			it('should insert one record to "mem_round" for valid parameters with considering positive balance mode if no balance mode is provided', function*() {
				// Prepare an account first
				const account = new accountsFixtures.Account({
					isDelegate: true,
					balance: '100',
				});
				yield db.accounts.insert(account);
				const round = 1;
				const delegate = '4567';
				const balanceMode = null;

				yield db.rounds.insertRoundInformationWithDelegate(
					account.address,
					round,
					delegate,
					balanceMode
				);

				const result = yield db.query('SELECT * FROM mem_round');

				expect(result).to.have.lengthOf(1);
				return expect(result[0]).to.be.eql({
					address: account.address,
					round,
					delegate,
					amount: account.balance,
				});
			});
		});

		describe('insertRoundRewards()', () => {
			it('should use the correct SQL file with five parameters', function*() {
				sinonSandbox.spy(db, 'none');
				const params = {
					timestamp: (+new Date() / 1000).toFixed(),
					fees: '123',
					reward: '123',
					round: 1,
					publicKey: '11111111',
				};
				yield db.rounds.insertRoundRewards(
					params.timestamp,
					params.fees,
					params.reward,
					params.round,
					params.publicKey
				);

				expect(db.none.firstCall.args[0]).to.eql(roundsSQL.insertRoundRewards);
				expect(db.none.firstCall.args[1]).to.eql(params);
				return expect(db.none).to.be.calledOnce;
			});

			it('should insert one record to "round_rewards" table', function*() {
				const params = {
					timestamp: parseInt((+new Date() / 1000).toFixed()),
					fees: '123',
					reward: '123',
					round: 1,
					publicKey: '11111111',
				};
				yield db.rounds.insertRoundRewards(
					params.timestamp,
					params.fees,
					params.reward,
					params.round,
					params.publicKey
				);

				const result = yield db.query('SELECT * FROM rounds_rewards');
				result[0].publicKey = Buffer.from(result[0].publicKey).toString('hex');

				expect(result).to.be.not.empty;
				expect(result).to.have.lengthOf(1);
				return expect(result[0]).to.be.eql(params);
			});
		});

		describe('deleteRoundRewards()', () => {
			it('should use the correct SQL file with five parameters', function*() {
				sinonSandbox.spy(db, 'none');
				yield db.rounds.deleteRoundRewards('1');

				expect(db.none.firstCall.args[0]).to.eql(roundsSQL.deleteRoundRewards);
				expect(db.none.firstCall.args[1]).to.eql({ round: '1' });
				return expect(db.none).to.be.calledOnce;
			});

			it('should delete all round rewards for a particular round', function*() {
				// Seed some round reward data
				yield db.rounds.insertRoundRewards(
					parseInt((+new Date() / 1000).toFixed()),
					'123',
					'123',
					1, // Round 1
					'11111111'
				);
				yield db.rounds.insertRoundRewards(
					parseInt((+new Date() / 1000).toFixed()),
					'123',
					'123',
					1, // Round 1
					'11111111'
				);
				yield db.rounds.insertRoundRewards(
					parseInt((+new Date() / 1000).toFixed()),
					'123',
					'123',
					2, // Round 2
					'11111111'
				);

				const before = yield db.query('SELECT * FROM rounds_rewards');
				yield db.rounds.deleteRoundRewards(1);
				const after = yield db.query('SELECT * FROM rounds_rewards');

				expect(before).to.have.lengthOf(3);
				expect(after).to.have.lengthOf(1);
				return expect(after[0].round).to.be.eql(2);
			});
		});
	});
});
