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
let outTransferRepo;

describe('db', () => {
	before(done => {
		dbSandbox = new DBSandbox(
			__testContext.config.db,
			'lisk_test_db_transactions_out_transfer'
		);

		dbSandbox.create((err, __db) => {
			db = __db;
			outTransferRepo = db['transactions.outTransfer'];
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
		return expect(outTransferRepo).to.be.not.null;
	});

	describe('OutTransferTransactionsRepo', () => {
		describe('constructor()', () => {
			it('should assign param and data members properly', () => {
				expect(outTransferRepo.db).to.be.eql(db);
				expect(outTransferRepo.pgp).to.be.eql(db.$config.pgp);
				expect(outTransferRepo.dbTable).to.be.eql('outtransfer');
				expect(outTransferRepo.dbFields).to.be.eql([
					'dappId',
					'outTransactionId',
					'transactionId',
				]);

				expect(outTransferRepo.cs).to.be.an('object');
				expect(outTransferRepo.cs).to.not.empty;
				expect(outTransferRepo.cs).to.have.all.keys('insert');
				return expect(
					outTransferRepo.cs.insert.columns.map(c => c.name)
				).to.be.eql(['dappId', 'outTransactionId', 'transactionId']);
			});
		});

		describe('save()', () => {
			it('should use pgp.helpers.insert with correct parameters', function*() {
				sinonSandbox.spy(db.$config.pgp.helpers, 'insert');

				const block = seeder.getLastBlock();
				const transaction = transactionsFixtures.Transaction({
					blockId: block.id,
					type: transactionTypes.OUT_TRANSFER,
				});
				yield db.transactions.save(transaction);

				// One call for trs table and one for respective transaction type table
				expect(db.$config.pgp.helpers.insert).to.have.callCount(2);

				// Expect the second call for for respective transaction type
				return expect(db.$config.pgp.helpers.insert.secondCall.args).to.be.eql([
					[
						{
							dappId: transaction.asset.outTransfer.dappId,
							outTransactionId: transaction.asset.outTransfer.transactionId,
							transactionId: transaction.id,
						},
					],
					outTransferRepo.cs.insert,
				]);
			});

			it('should insert entry into "outtransfer" table for type 7 transactions', function*() {
				const block = seeder.getLastBlock();
				const transactions = [];
				for (let i = 0; i < numSeedRecords; i++) {
					transactions.push(
						transactionsFixtures.Transaction({
							blockId: block.id,
							type: transactionTypes.OUT_TRANSFER,
						})
					);
				}
				yield db.transactions.save(transactions);

				const result = yield db.query('SELECT * FROM outtransfer');

				expect(result).to.not.empty;
				expect(result).to.have.lengthOf(numSeedRecords);
				expect(result.map(r => r.transactionId)).to.be.eql(
					transactions.map(t => t.id)
				);
				expect(result.map(r => r.dappId)).to.be.eql(
					transactions.map(t => t.asset.outTransfer.dappId)
				);
				return expect(result.map(r => r.outTransactionId)).to.be.eql(
					transactions.map(t => t.asset.outTransfer.transactionId)
				);
			});
		});
	});
});
