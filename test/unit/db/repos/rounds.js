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

const BigNumber = require('bignumber.js');
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

		describe('getMemRounds()', () => {
			it('should use the correct SQL file with no parameters', function*() {
				sinonSandbox.spy(db, 'query');
				yield db.rounds.getMemRounds();

				expect(db.query.firstCall.args[0]).to.eql(roundsSQL.getMemRounds);
				expect(db.query.firstCall.args[1]).to.eql(undefined);
				return expect(db.query).to.be.calledOnce;
			});

			it('should return unique round numbers', function*() {
				const round1 = roundsFixtures.Round({ round: 1 });
				const round2 = roundsFixtures.Round({ round: 2 });
				const round3 = roundsFixtures.Round({ round: 1 });

				yield db.query(
					db.rounds.pgp.helpers.insert(round1, null, { table: 'mem_round' })
				);
				yield db.query(
					db.rounds.pgp.helpers.insert(round2, null, { table: 'mem_round' })
				);
				yield db.query(
					db.rounds.pgp.helpers.insert(round3, null, { table: 'mem_round' })
				);

				const result1 = yield db.query('SELECT * FROM mem_round;');
				const result2 = yield db.rounds.getMemRounds();

				// Actually there are three records but getMemRounds return unique round
				expect(result1).to.have.lengthOf(3);
				expect(result2).to.have.lengthOf(2);
				expect(result2[0]).to.have.all.keys('round');
				return expect(result2.map(r => r.round)).to.have.all.members([1, 2]);
			});
		});

		describe('flush()', () => {
			it('should use the correct SQL file with one parameter', function*() {
				sinonSandbox.spy(db, 'none');
				yield db.rounds.flush(1);

				expect(db.none.firstCall.args[0]).to.eql(roundsSQL.flush);
				expect(db.none.firstCall.args[1]).to.eql([1]);
				return expect(db.none).to.be.calledOnce;
			});

			it('should remove round information for provided round number', function*() {
				const round1 = roundsFixtures.Round({ round: 1 });
				const round2 = roundsFixtures.Round({ round: 2 });
				yield db.query(
					db.rounds.pgp.helpers.insert(round1, null, { table: 'mem_round' })
				);
				yield db.query(
					db.rounds.pgp.helpers.insert(round2, null, { table: 'mem_round' })
				);

				const before = yield db.query('SELECT * FROM mem_round;');
				const result = yield db.rounds.flush(round1.round);
				const after = yield db.query('SELECT * FROM mem_round;');

				// Before flushing there were two records
				expect(before).to.have.lengthOf(2);

				// Flushing does not return any thing
				expect(result).to.be.eql(null);

				// After flushing there is one record
				expect(after).to.have.lengthOf(1);

				// And the only record available is what was not flushed
				return expect(after[0].round).to.be.eql(round2.round);
			});

			it('should resolve with null if round does not exists', () => {
				return expect(db.rounds.flush('1234')).to.be.eventually.eql(null);
			});
		});

		describe('updateMissedBlocks()', () => {
			it('should use the correct SQL file with correct parameters with backward flag set to true', function*() {
				sinonSandbox.spy(db, 'none');
				yield db.rounds.updateMissedBlocks(true, ['123L']);

				expect(db.none.firstCall.args[0]).to.eql(roundsSQL.updateMissedBlocks);
				expect(db.none.firstCall.args[1]).to.eql({
					change: '- 1',
					outsiders: ['123L'],
				});
				return expect(db.none).to.be.calledOnce;
			});

			it('should use the correct SQL file with correct parameters with backward flag set to false', function*() {
				sinonSandbox.spy(db, 'none');
				yield db.rounds.updateMissedBlocks(false, ['123L']);

				expect(db.none.firstCall.args[0]).to.eql(roundsSQL.updateMissedBlocks);
				expect(db.none.firstCall.args[1]).to.eql({
					change: '+ 1',
					outsiders: ['123L'],
				});
				return expect(db.none).to.be.calledOnce;
			});

			it('should reject with error if list of address is not provided', () => {
				return expect(db.rounds.updateMissedBlocks(false)).to.be.rejectedWith(
					'syntax error'
				);
			});

			it('should resolve with null if single address is provided', () => {
				return expect(db.rounds.updateMissedBlocks(false, '123L')).to.be
					.fulfilled;
			});

			it('should increment missed blocks for an account if backward flag is set to false', function*() {
				const account = accountsFixtures.Account();
				yield db.accounts.insert(account);
				const before = account.missedBlocks;
				yield db.rounds.updateMissedBlocks(false, account.address);
				const after = (yield db.accounts.list({ address: account.address }))[0]
					.missedBlocks;

				return expect(after).to.be.eql(before + 1);
			});

			it('should decrement missed blocks for an account if backward flag is set to true', function*() {
				const account = accountsFixtures.Account();
				yield db.accounts.insert(account);
				const before = account.missedBlocks;
				yield db.rounds.updateMissedBlocks(true, account.address);
				const after = (yield db.accounts.list({ address: account.address }))[0]
					.missedBlocks;

				return expect(after).to.be.eql(before - 1);
			});
		});

		describe('getVotes()', () => {
			it('should use the correct SQL file with one parameter', function*() {
				sinonSandbox.spy(db, 'query');
				yield db.rounds.getVotes(1);

				expect(db.query.firstCall.args[0]).to.eql(roundsSQL.getVotes);
				expect(db.query.firstCall.args[1]).to.eql({ round: 1 });
				return expect(db.query).to.be.calledOnce;
			});

			it('should return votes for a round in correct format', function*() {
				const account = accountsFixtures.Account();

				const round1 = roundsFixtures.Round({
					round: 1,
					delegate: account.publicKey,
				});
				const round2 = roundsFixtures.Round({
					round: 1,
					delegate: account.publicKey,
				});
				const round3 = roundsFixtures.Round({ round: 2 });
				yield db.query(
					db.rounds.pgp.helpers.insert(round1, null, { table: 'mem_round' })
				);
				yield db.query(
					db.rounds.pgp.helpers.insert(round2, null, { table: 'mem_round' })
				);
				yield db.query(
					db.rounds.pgp.helpers.insert(round3, null, { table: 'mem_round' })
				);

				const allRecords = yield db.query('SELECT * FROM mem_round');
				const result = yield db.rounds.getVotes(1);

				expect(allRecords).to.have.lengthOf(3);
				expect(result).to.be.not.empty;
				expect(result).to.have.lengthOf(1);
				expect(result[0]).to.be.have.all.keys('delegate', 'amount');
				return expect(result[0]).to.be.eql({
					delegate: account.publicKey,
					amount: new BigNumber(round1.amount).plus(round2.amount).toString(),
				});
			});

			it('should resolve without any error if no round number is provided', () => {
				return expect(db.rounds.getVotes()).to.be.fulfilled;
			});

			it('should resolve without any error if unnown round number is provided', () => {
				return expect(db.rounds.getVotes(1234)).to.be.fulfilled;
			});
		});

		describe('updateVotes()', () => {
			it('should use the correct SQL file with two parameters', function*() {
				sinonSandbox.spy(db, 'none');
				yield db.rounds.updateVotes('123L', '123');

				expect(db.none.firstCall.args[0]).to.eql(roundsSQL.updateVotes);
				expect(db.none.firstCall.args[1]).to.eql(['123', '123L']);
				return expect(db.none).to.be.calledOnce;
			});

			it('should update votes for a given account', function*() {
				const account = accountsFixtures.Account();
				yield db.accounts.insert(account);

				yield db.rounds.updateVotes(account.address, '123');
				const result = (yield db.accounts.list({
					address: account.address,
				}))[0];

				return expect(result.vote).to.be.eql(
					new BigNumber(account.vote).plus('123').toString()
				);
			});

			it('should resolve without error if parameter "address" is not provided', () => {
				return expect(db.rounds.updateVotes(null, '123')).to.be.fulfilled;
			});
		});

		describe('summedRound()', () => {
			it('should use the correct SQL file with one parameter', function*() {
				sinonSandbox.spy(db, 'query');
				yield db.rounds.summedRound(1, 2);

				expect(db.query.firstCall.args[0]).to.eql(roundsSQL.summedRound);
				expect(db.query.firstCall.args[1]).to.eql({
					round: 1,
					activeDelegates: 2,
				});
				return expect(db.query).to.be.calledOnce;
			});

			it('should return the summed result in valid format', function*() {
				// Sum the round 1 with active delegates to 2
				const result = yield db.rounds.summedRound(1, 2);
				const blocks = seeder.getBlocks();

				// The blocks for round 1 would be with height 1 and 2
				// referred as index 0 and 1 in the array
				const computedBlocks = [blocks[0], blocks[1]];

				expect(result).to.be.not.empty;
				expect(result).to.have.lengthOf(1);
				expect(result[0]).to.have.all.keys('fees', 'rewards', 'delegates');
				expect(result[0].rewards).to.be.an('array');
				expect(result[0].delegates).to.be.an('array');
				expect(result[0].fees).to.be.eql(
					new BigNumber(computedBlocks[0].totalFee)
						.plus(computedBlocks[1].totalFee)
						.toString()
				);
				expect(result[0].rewards).to.be.eql(computedBlocks.map(b => b.reward));
				return expect(result[0].delegates).to.be.eql(
					computedBlocks.map(b => b.generatorPublicKey)
				);
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
					roundsFixtures.Round(),
					roundsFixtures.Round(),
					roundsFixtures.Round(),
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
				const account = accountsFixtures.Account();

				const round1 = roundsFixtures.Round({
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
				const account = accountsFixtures.Account();

				const round1 = roundsFixtures.Round({
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
					roundsFixtures.Round(),
					roundsFixtures.Round(),
					roundsFixtures.Round(),
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
				const account = accountsFixtures.Account({ isDelegate: true });
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
				const account1 = accountsFixtures.Account({ isDelegate: true });
				const account2 = accountsFixtures.Account({ isDelegate: true });
				const account3 = accountsFixtures.Account({ isDelegate: true });
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
				const account1 = accountsFixtures.Account({ isDelegate: true });
				const account2 = accountsFixtures.Account({ isDelegate: true });
				const account3 = accountsFixtures.Account({ isDelegate: true });
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
				const account1 = accountsFixtures.Account({ isDelegate: true });
				const account2 = accountsFixtures.Account({ isDelegate: true });
				const account3 = accountsFixtures.Account({ isDelegate: false });
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
					roundsFixtures.Round(),
					roundsFixtures.Round(),
					roundsFixtures.Round(),
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
				const account1 = accountsFixtures.Account({ isDelegate: true });
				const account2 = accountsFixtures.Account({ isDelegate: true });
				const account3 = accountsFixtures.Account({ isDelegate: true });
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
				const account = accountsFixtures.Account({ isDelegate: true });
				const delegate = '12345678';
				yield db.accounts.insert(account);
				yield db.accounts.insertDependencies(
					account.address,
					delegate,
					'delegates'
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
				const account = accountsFixtures.Account({
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
				const account = accountsFixtures.Account({
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
				const account = accountsFixtures.Account({
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
