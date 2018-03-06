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
const transactionsFixtures = require('../../../fixtures').transactions;
const seeder = require('../../../common/db_seed');
const transactionTypes = require('../../../../helpers/transaction_types');

const numSeedRecords = 5;

let db;
let dbSandbox;
let transferRepo;

describe('db', () => {
	before(done => {
		dbSandbox = new DBSandbox(
			__testContext.config.db,
			'lisk_test_db_transactions_transfer'
		);

		dbSandbox.create((err, __db) => {
			db = __db;
			transferRepo = db['transactions.transfer'];
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
		return expect(transferRepo).to.be.not.null;
	});

	describe('TransferTransactionsRepo', () => {
		describe('constructor()', () => {
			it('should assign param and data members properly', () => {
				expect(transferRepo.db).to.be.eql(db);
				expect(transferRepo.pgp).to.be.eql(db.$config.pgp);
				expect(transferRepo.dbTable).to.be.eql('transfer');
				expect(transferRepo.dbFields).to.be.eql(['data', 'transactionId']);

				expect(transferRepo.cs).to.be.an('object');
				expect(transferRepo.cs).to.not.empty;
				return expect(transferRepo.cs).to.have.all.keys('insert');
			});
		});

		describe('save', () => {
			it('should insert entry into "delegates" table for type 0 transactions', function*() {
				const block = seeder.getLastBlock();
				const transactions = [];
				for (let i = 0; i < numSeedRecords; i++) {
					transactions.push(
						transactionsFixtures.Transaction({
							blockId: block.id,
							type: transactionTypes.TRANSFER,
						})
					);
				}
				yield db.transactions.save(transactions);

				const result = yield db.query('SELECT * FROM transfer');

				expect(result).to.not.empty;
				expect(result).to.have.lengthOf(numSeedRecords);
				expect(result.map(r => Buffer.from(r.data).toString())).to.be.eql(
					transactions.map(t => t.asset.data)
				);
				return expect(result.map(r => r.transactionId)).to.be.eql(
					transactions.map(t => t.id)
				);
			});
		});
	});
});
