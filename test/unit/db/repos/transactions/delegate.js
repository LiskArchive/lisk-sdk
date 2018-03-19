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
let delegatesRepo;

describe('db', () => {
	before(done => {
		dbSandbox = new DBSandbox(
			__testContext.config.db,
			'lisk_test_db_transactions_delegates'
		);

		dbSandbox.create((err, __db) => {
			db = __db;
			delegatesRepo = db['transactions.delegate'];
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
		return expect(delegatesRepo).to.be.not.null;
	});

	describe('DelegateTransactionsRepo', () => {
		describe('constructor()', () => {
			it('should assign param and data members properly', () => {
				expect(delegatesRepo.db).to.be.eql(db);
				expect(delegatesRepo.pgp).to.be.eql(db.$config.pgp);
				expect(delegatesRepo.dbTable).to.be.eql('delegates');
				expect(delegatesRepo.dbFields).to.be.eql(['transactionId', 'username']);

				expect(delegatesRepo.cs).to.be.an('object');
				expect(delegatesRepo.cs).to.not.empty;
				expect(delegatesRepo.cs).to.have.all.keys('insert');
				return expect(
					delegatesRepo.cs.insert.columns.map(c => c.name)
				).to.be.eql(['transactionId', 'username']);
			});
		});

		describe('save()', () => {
			it('should use pgp.helpers.insert with correct parameters', function*() {
				sinonSandbox.spy(db.$config.pgp.helpers, 'insert');

				const block = seeder.getLastBlock();
				const transaction = transactionsFixtures.Transaction({
					blockId: block.id,
					type: transactionTypes.DELEGATE,
				});
				yield db.transactions.save(transaction);

				// One call for trs table and one for respective transaction type table
				expect(db.$config.pgp.helpers.insert).to.have.callCount(2);

				// Expect the second call for for respective transaction type
				return expect(db.$config.pgp.helpers.insert.secondCall.args).to.be.eql([
					[
						{
							transactionId: transaction.id,
							username: transaction.asset.delegate.username,
						},
					],
					delegatesRepo.cs.insert,
				]);
			});

			it('should insert entry into "delegates" table for type 2 transactions', function*() {
				const block = seeder.getLastBlock();
				const transactions = [];
				for (let i = 0; i < numSeedRecords; i++) {
					transactions.push(
						transactionsFixtures.Transaction({
							blockId: block.id,
							type: transactionTypes.DELEGATE,
						})
					);
				}
				yield db.transactions.save(transactions);

				const result = yield db.query('SELECT * FROM delegates');

				expect(result).to.not.empty;
				expect(result).to.have.lengthOf(numSeedRecords);
				expect(result.map(r => r.transactionId)).to.be.eql(
					transactions.map(t => t.id)
				);
				return expect(
					result.map(r => {
						delete r.transactionId;
						return r;
					})
				).to.be.eql(transactions.map(t => t.asset.delegate));
			});
		});
	});
});
