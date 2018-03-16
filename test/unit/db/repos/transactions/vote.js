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

const DBSandbox = require('../../../../common/db_sandbox').DBSandbox;
const transactionsFixtures = require('../../../../fixtures/index').transactions;
const seeder = require('../../../../common/db_seed');
const transactionTypes = require('../../../../../helpers/transaction_types');

const numSeedRecords = 5;

let db;
let dbSandbox;
let voteRepo;

describe('db', () => {
	before(done => {
		dbSandbox = new DBSandbox(
			__testContext.config.db,
			'lisk_test_db_transactions_vote'
		);

		dbSandbox.create((err, __db) => {
			db = __db;
			voteRepo = db['transactions.vote'];
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

	it('should initialize db.blocks repo', () => {
		return expect(voteRepo).to.be.not.null;
	});

	describe('VoteTransactionsRepo', () => {
		describe('constructor()', () => {
			it('should assign param and data members properly', () => {
				expect(voteRepo.db).to.be.eql(db);
				expect(voteRepo.pgp).to.be.eql(db.$config.pgp);
				expect(voteRepo.dbTable).to.be.eql('votes');
				expect(voteRepo.dbFields).to.be.eql(['votes', 'transactionId']);

				expect(voteRepo.cs).to.be.an('object');
				expect(voteRepo.cs).to.not.empty;
				expect(voteRepo.cs).to.have.all.keys('insert');
				return expect(voteRepo.cs.insert.columns.map(c => c.name)).to.be.eql([
					'votes',
					'transactionId',
				]);
			});
		});

		describe('save()', () => {
			it('should use pgp.helpers.insert with correct parameters', function*() {
				sinonSandbox.spy(db.$config.pgp.helpers, 'insert');

				const block = seeder.getLastBlock();
				const transaction = transactionsFixtures.Transaction({
					blockId: block.id,
					type: transactionTypes.VOTE,
				});
				yield db.transactions.save(transaction);

				// One call for trs table and one for respective transaction type table
				expect(db.$config.pgp.helpers.insert).to.have.callCount(2);

				// Expect the second call for for respective transaction type
				return expect(db.$config.pgp.helpers.insert.secondCall.args).to.be.eql([
					[
						{
							votes: transaction.asset.votes.join(),
							transactionId: transaction.id,
						},
					],
					voteRepo.cs.insert,
				]);
			});

			it('should insert entry into "votes" table for type 3 transactions', function*() {
				const block = seeder.getLastBlock();
				const transactions = [];
				for (let i = 0; i < numSeedRecords; i++) {
					transactions.push(
						transactionsFixtures.Transaction({
							blockId: block.id,
							type: transactionTypes.VOTE,
						})
					);
				}
				yield db.transactions.save(transactions);

				const result = yield db.query('SELECT * FROM votes');

				expect(result).to.not.empty;
				expect(result).to.have.lengthOf(numSeedRecords);
				expect(result.map(r => r.votes)).to.be.eql(
					transactions.map(t => t.asset.votes.join())
				);
				return expect(result.map(r => r.transactionId)).to.be.eql(
					transactions.map(t => t.id)
				);
			});
		});
	});
});
