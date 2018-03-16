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
let signatureRepo;

describe('db', () => {
	before(done => {
		dbSandbox = new DBSandbox(
			__testContext.config.db,
			'lisk_test_db_transactions_signature'
		);

		dbSandbox.create((err, __db) => {
			db = __db;
			signatureRepo = db['transactions.signature'];
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
		return expect(signatureRepo).to.be.not.null;
	});

	describe('SignatureTransactionsRepo', () => {
		describe('constructor()', () => {
			it('should assign param and data members properly', () => {
				expect(signatureRepo.db).to.be.eql(db);
				expect(signatureRepo.pgp).to.be.eql(db.$config.pgp);
				expect(signatureRepo.dbTable).to.be.eql('signatures');
				expect(signatureRepo.dbFields).to.be.eql([
					'transactionId',
					'publicKey',
				]);

				expect(signatureRepo.cs).to.be.an('object');
				expect(signatureRepo.cs).to.not.empty;
				expect(signatureRepo.cs).to.have.all.keys('insert');
				return expect(
					signatureRepo.cs.insert.columns.map(c => c.name)
				).to.be.eql(['transactionId', 'publicKey']);
			});
		});

		describe('save()', () => {
			it('should use pgp.helpers.insert with correct parameters', function*() {
				sinonSandbox.spy(db.$config.pgp.helpers, 'insert');

				const block = seeder.getLastBlock();
				const transaction = transactionsFixtures.Transaction({
					blockId: block.id,
					type: transactionTypes.SIGNATURE,
				});
				yield db.transactions.save(transaction);

				// One call for trs table and one for respective transaction type table
				expect(db.$config.pgp.helpers.insert).to.have.callCount(2);

				// Expect the second call for for respective transaction type
				return expect(db.$config.pgp.helpers.insert.secondCall.args).to.be.eql([
					[
						{
							transactionId: transaction.id,
							publicKey: Buffer.from(
								transaction.asset.signature.publicKey,
								'hex'
							),
						},
					],
					signatureRepo.cs.insert,
				]);
			});

			it('should insert entry into "signatures" table for type 1 transactions', function*() {
				const block = seeder.getLastBlock();
				const transactions = [];
				for (let i = 0; i < numSeedRecords; i++) {
					transactions.push(
						transactionsFixtures.Transaction({
							blockId: block.id,
							type: transactionTypes.SIGNATURE,
						})
					);
				}
				yield db.transactions.save(transactions);

				const result = yield db.query('SELECT * FROM signatures');

				expect(result).to.not.empty;
				expect(result).to.have.lengthOf(numSeedRecords);
				expect(
					result.map(r => Buffer.from(r.publicKey).toString('hex'))
				).to.be.eql(transactions.map(t => t.asset.signature.publicKey));
				return expect(result.map(r => r.transactionId)).to.be.eql(
					transactions.map(t => t.id)
				);
			});
		});
	});
});
