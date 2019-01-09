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

const randomstring = require('randomstring');
const ed = require('../../../../../helpers/ed.js');
const DBSandbox = require('../../../../common/db_sandbox').DBSandbox;
const transactionsFixtures = require('../../../../fixtures/index').transactions;
const transactionsSQL = require('../../../../../db/sql/index').transactions;
const seeder = require('../../../../common/db_seed');
const transactionTypes = require('../../../../../helpers/transaction_types');

const numSeedRecords = 5;

let db;
let dbSandbox;

describe('db', () => {
	before(done => {
		dbSandbox = new DBSandbox(
			__testContext.config.db,
			'lisk_test_db_transactions'
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

	describe('TransactionsRepository', () => {
		describe('constructor()', () => {
			it('should assign param and data members properly', () => {
				expect(db.transactions.db).to.be.eql(db);
				expect(db.transactions.pgp).to.be.eql(db.$config.pgp);

				expect(db.transactions.sortFields).to.be.eql([
					'id',
					'blockId',
					'amount',
					'fee',
					'type',
					'timestamp',
					'senderPublicKey',
					'senderId',
					'recipientId',
					'confirmations',
					'height',
				]);

				expect(db.transactions.dbTable).to.be.eql('trs');

				expect(db.transactions.dbFields).to.be.eql([
					'id',
					'blockId',
					'type',
					'timestamp',
					'senderPublicKey',
					'requesterPublicKey',
					'senderId',
					'recipientId',
					'amount',
					'fee',
					'signature',
					'signSignature',
					'signatures',
				]);

				expect(db.transactions.cs).to.be.an('object');
				expect(db.transactions.cs).to.not.empty;
				expect(db.transactions.cs).to.have.all.keys('insert');
				expect(db.transactions.cs.insert.columns.map(c => c.name)).to.be.eql([
					'id',
					'blockId',
					'type',
					'timestamp',
					'senderPublicKey',
					'requesterPublicKey',
					'senderId',
					'recipientId',
					'amount',
					'fee',
					'signature',
					'signSignature',
					'signatures',
				]);

				expect(db.transactions.transactionsRepoMap).to.be.an('object');
				return expect(db.transactions.transactionsRepoMap).to.have.all.keys(
					transactionTypes.SEND,
					transactionTypes.DAPP,
					transactionTypes.DELEGATE,
					transactionTypes.IN_TRANSFER,
					transactionTypes.OUT_TRANSFER,
					transactionTypes.MULTI,
					transactionTypes.SIGNATURE,
					transactionTypes.VOTE
				);
			});
		});

		describe('count()', () => {
			it('should use the correct SQL with no parameters', function*() {
				sinonSandbox.spy(db, 'one');
				yield db.transactions.count();

				expect(db.one.firstCall.args[0]).to.eql(transactionsSQL.count);
				expect(db.one.firstCall.args[1]).to.eql([]);
				return expect(db.one.firstCall.args[2]).to.be.a('function');
			});

			it('should return integer type count of total transactions', function*() {
				const transactions = [];

				for (let i = 0; i < numSeedRecords; i++) {
					transactions.push(
						new transactionsFixtures.Transaction({
							blockId: seeder.getLastBlock().id,
						})
					);
				}
				yield db.transactions.save(transactions);

				const result = yield db.transactions.count();

				expect(result).to.be.a('number');
				return expect(result).to.be.eql(numSeedRecords);
			});
		});

		describe('getTransferByIds()', () => {
			it('should use the correct SQL file with correct parameters', function*() {
				sinonSandbox.spy(db, 'any');
				yield db.transactions.getTransferByIds(['12', '34']);

				expect(db.any.firstCall.args[0]).to.eql(
					transactionsSQL.getTransferByIds
				);
				expect(db.any.firstCall.args[1]).to.eql({ ids: ['12', '34'] });
				return expect(db.any).to.be.calledOnce;
			});

			it('should return result in valid format', function*() {
				const transactions = [];

				for (let i = 0; i < numSeedRecords; i++) {
					transactions.push(
						new transactionsFixtures.Transaction({
							blockId: seeder.getLastBlock().id,
							type: transactionTypes.SEND,
						})
					);
				}
				yield db.transactions.save(transactions);

				// Check for last transaction
				const result = yield db.transactions.getTransferByIds(
					transactions.map(t => t.id)
				);

				expect(result).to.not.empty;
				expect(result).to.have.lengthOf(numSeedRecords);
				expect(result.map(r => r.transaction_id)).to.be.eql(
					transactions.map(t => t.id)
				);
				return expect(result[0]).to.have.all.keys('transaction_id', 'tf_data');
			});
		});

		describe('getVotesByIds()', () => {
			it('should use the correct SQL file with correct parameters', function*() {
				sinonSandbox.spy(db, 'any');
				yield db.transactions.getVotesByIds(['12', '34']);

				expect(db.any.firstCall.args[0]).to.eql(transactionsSQL.getVotesByIds);
				expect(db.any.firstCall.args[1]).to.eql({ ids: ['12', '34'] });
				return expect(db.any).to.be.calledOnce;
			});

			it('should return result in valid format', function*() {
				const transactions = [];

				for (let i = 0; i < numSeedRecords; i++) {
					transactions.push(
						new transactionsFixtures.Transaction({
							blockId: seeder.getLastBlock().id,
							type: transactionTypes.VOTE,
						})
					);
				}
				yield db.transactions.save(transactions);

				// Check for last transaction
				const result = yield db.transactions.getVotesByIds(
					transactions.map(t => t.id)
				);

				expect(result).to.not.empty;
				expect(result).to.have.lengthOf(numSeedRecords);
				expect(result.map(r => r.transaction_id)).to.be.eql(
					transactions.map(t => t.id)
				);
				return expect(result[0]).to.have.all.keys('transaction_id', 'v_votes');
			});
		});

		describe('getDelegateByIds()', () => {
			it('should use the correct SQL file with correct parameters', function*() {
				sinonSandbox.spy(db, 'any');
				yield db.transactions.getDelegateByIds(['12', '34']);

				expect(db.any.firstCall.args[0]).to.eql(
					transactionsSQL.getDelegateByIds
				);
				expect(db.any.firstCall.args[1]).to.eql({ ids: ['12', '34'] });
				return expect(db.any).to.be.calledOnce;
			});

			it('should return result in valid format', function*() {
				const transactions = [];

				for (let i = 0; i < numSeedRecords; i++) {
					transactions.push(
						new transactionsFixtures.Transaction({
							blockId: seeder.getLastBlock().id,
							type: transactionTypes.DELEGATE,
						})
					);
				}
				yield db.transactions.save(transactions);

				// Check for last transaction
				const result = yield db.transactions.getDelegateByIds(
					transactions.map(t => t.id)
				);

				expect(result).to.not.empty;
				expect(result).to.have.lengthOf(numSeedRecords);
				expect(result.map(r => r.transaction_id)).to.be.eql(
					transactions.map(t => t.id)
				);
				return expect(result[0]).to.have.all.keys(
					'transaction_id',
					'd_username'
				);
			});
		});

		describe('getSignatureByIds()', () => {
			it('should use the correct SQL file with correct parameters', function*() {
				sinonSandbox.spy(db, 'any');
				yield db.transactions.getSignatureByIds(['12', '34']);

				expect(db.any.firstCall.args[0]).to.eql(
					transactionsSQL.getSignatureByIds
				);
				expect(db.any.firstCall.args[1]).to.eql({ ids: ['12', '34'] });
				return expect(db.any).to.be.calledOnce;
			});

			it('should return result in valid format', function*() {
				const transactions = [];

				for (let i = 0; i < numSeedRecords; i++) {
					transactions.push(
						new transactionsFixtures.Transaction({
							blockId: seeder.getLastBlock().id,
							type: transactionTypes.SIGNATURE,
						})
					);
				}
				yield db.transactions.save(transactions);

				// Check for last transaction
				const result = yield db.transactions.getSignatureByIds(
					transactions.map(t => t.id)
				);

				expect(result).to.not.empty;
				expect(result).to.have.lengthOf(numSeedRecords);
				expect(result.map(r => r.transaction_id)).to.be.eql(
					transactions.map(t => t.id)
				);
				return expect(result[0]).to.have.all.keys(
					'transaction_id',
					's_publicKey'
				);
			});
		});

		describe('getMultiByIds()', () => {
			it('should use the correct SQL file with correct parameters', function*() {
				sinonSandbox.spy(db, 'any');
				yield db.transactions.getMultiByIds(['12', '34']);

				expect(db.any.firstCall.args[0]).to.eql(transactionsSQL.getMultiByIds);
				expect(db.any.firstCall.args[1]).to.eql({ ids: ['12', '34'] });
				return expect(db.any).to.be.calledOnce;
			});

			it('should return result in valid format', function*() {
				const transactions = [];

				for (let i = 0; i < numSeedRecords; i++) {
					transactions.push(
						new transactionsFixtures.Transaction({
							blockId: seeder.getLastBlock().id,
							type: transactionTypes.MULTI,
						})
					);
				}
				yield db.transactions.save(transactions);

				// Check for last transaction
				const result = yield db.transactions.getMultiByIds(
					transactions.map(t => t.id)
				);

				expect(result).to.not.empty;
				expect(result).to.have.lengthOf(numSeedRecords);
				expect(result.map(r => r.transaction_id)).to.be.eql(
					transactions.map(t => t.id)
				);
				return expect(result[0]).to.have.all.keys(
					'transaction_id',
					'm_min',
					'm_lifetime',
					'm_keysgroup'
				);
			});
		});

		describe('getDappByIds()', () => {
			it('should use the correct SQL file with correct parameters', function*() {
				sinonSandbox.spy(db, 'any');
				yield db.transactions.getDappByIds(['12', '34']);

				expect(db.any.firstCall.args[0]).to.eql(transactionsSQL.getDappByIds);
				expect(db.any.firstCall.args[1]).to.eql({ ids: ['12', '34'] });
				return expect(db.any).to.be.calledOnce;
			});

			it('should return result in valid format', function*() {
				const transactions = [];

				for (let i = 0; i < numSeedRecords; i++) {
					transactions.push(
						new transactionsFixtures.Transaction({
							blockId: seeder.getLastBlock().id,
							type: transactionTypes.DAPP,
						})
					);
				}
				yield db.transactions.save(transactions);

				// Check for last transaction
				const result = yield db.transactions.getDappByIds(
					transactions.map(t => t.id)
				);

				expect(result).to.not.empty;
				expect(result).to.have.lengthOf(numSeedRecords);
				expect(result.map(r => r.transaction_id)).to.be.eql(
					transactions.map(t => t.id)
				);
				return expect(result[0]).to.have.all.keys(
					'transaction_id',
					'dapp_name',
					'dapp_description',
					'dapp_tags',
					'dapp_link',
					'dapp_type',
					'dapp_category',
					'dapp_icon'
				);
			});
		});

		describe('getInTransferByIds()', () => {
			it('should use the correct SQL file with correct parameters', function*() {
				sinonSandbox.spy(db, 'any');
				yield db.transactions.getInTransferByIds(['12', '34']);

				expect(db.any.firstCall.args[0]).to.eql(
					transactionsSQL.getInTransferByIds
				);
				expect(db.any.firstCall.args[1]).to.eql({ ids: ['12', '34'] });
				return expect(db.any).to.be.calledOnce;
			});

			it('should return result in valid format', function*() {
				const transactions = [];

				for (let i = 0; i < numSeedRecords; i++) {
					transactions.push(
						new transactionsFixtures.Transaction({
							blockId: seeder.getLastBlock().id,
							type: transactionTypes.IN_TRANSFER,
						})
					);
				}
				yield db.transactions.save(transactions);

				// Check for last transaction
				const result = yield db.transactions.getInTransferByIds(
					transactions.map(t => t.id)
				);

				expect(result).to.not.empty;
				expect(result).to.have.lengthOf(numSeedRecords);
				expect(result.map(r => r.transaction_id)).to.be.eql(
					transactions.map(t => t.id)
				);
				return expect(result[0]).to.have.all.keys(
					'transaction_id',
					'in_dappId'
				);
			});
		});

		describe('getOutTransferByIds()', () => {
			it('should use the correct SQL file with correct parameters', function*() {
				sinonSandbox.spy(db, 'any');
				yield db.transactions.getOutTransferByIds(['12', '34']);

				expect(db.any.firstCall.args[0]).to.eql(
					transactionsSQL.getOutTransferByIds
				);
				expect(db.any.firstCall.args[1]).to.eql({ ids: ['12', '34'] });
				return expect(db.any).to.be.calledOnce;
			});

			it('should return result in valid format', function*() {
				const transactions = [];

				for (let i = 0; i < numSeedRecords; i++) {
					transactions.push(
						new transactionsFixtures.Transaction({
							blockId: seeder.getLastBlock().id,
							type: transactionTypes.OUT_TRANSFER,
						})
					);
				}
				yield db.transactions.save(transactions);

				// Check for last transaction
				const result = yield db.transactions.getOutTransferByIds(
					transactions.map(t => t.id)
				);

				expect(result).to.not.empty;
				expect(result).to.have.lengthOf(numSeedRecords);
				expect(result.map(r => r.transaction_id)).to.be.eql(
					transactions.map(t => t.id)
				);
				return expect(result[0]).to.have.all.keys(
					'transaction_id',
					'ot_dappId',
					'ot_outTransactionId'
				);
			});
		});

		describe('save()', () => {
			it('should use pgp.helpers.insert with correct parameters', function*() {
				sinonSandbox.spy(db.$config.pgp.helpers, 'insert');

				const block = seeder.getLastBlock();
				const transaction = new transactionsFixtures.Transaction({
					blockId: block.id,
				});
				yield db.transactions.save(transaction);

				transaction.senderPublicKey = Buffer.from(
					transaction.senderPublicKey,
					'hex'
				);
				transaction.signature = ed.hexToBuffer(transaction.signature);
				transaction.signSignature = ed.hexToBuffer(transaction.signSignature);
				transaction.requesterPublicKey = Buffer.from(
					transaction.requesterPublicKey,
					'hex'
				);
				transaction.signatures = transaction.signatures.join();

				// One call for trs table and one for transfer table
				expect(db.$config.pgp.helpers.insert).to.have.callCount(2);
				return expect(db.$config.pgp.helpers.insert.firstCall.args).to.be.eql([
					[transaction],
					db.transactions.cs.insert,
				]);
			});

			it('should save single transaction', function*() {
				const block = seeder.getLastBlock();
				const transaction = new transactionsFixtures.Transaction({
					blockId: block.id,
				});
				yield db.transactions.save(transaction);

				const result = yield db.query('SELECT * from trs');

				expect(result).to.not.empty;
				expect(result).to.have.lengthOf(1);
				return expect(result[0].id).to.be.eql(transaction.id);
			});

			it('should save multiple transactions', function*() {
				const block = seeder.getLastBlock();
				const transaction1 = new transactionsFixtures.Transaction({
					blockId: block.id,
				});
				const transaction2 = new transactionsFixtures.Transaction({
					blockId: block.id,
				});
				yield db.transactions.save([transaction1, transaction2]);

				const result = yield db.query('SELECT * from trs');

				expect(result).to.not.empty;
				expect(result).to.have.lengthOf(2);
				expect(result[0].id).to.be.eql(transaction1.id);
				return expect(result[1].id).to.be.eql(transaction2.id);
			});

			it('should save transform necessary attributes of transaction', function*() {
				sinonSandbox.spy(Buffer, 'from');
				const block = seeder.getLastBlock();
				const transaction = new transactionsFixtures.Transaction({
					blockId: block.id,
				});
				transaction.requesterPublicKey = randomstring.generate({
					charset: 'hex',
					length: 64,
					capitalization: 'lowercase',
				});
				transaction.signSignature = randomstring.generate({
					charset: 'hex',
					length: 64,
					capitalization: 'lowercase',
				});
				yield db.transactions.save(transaction);

				expect(Buffer.from).to.be.calledWith(
					transaction.senderPublicKey,
					'hex'
				);
				expect(Buffer.from).to.be.calledWith(transaction.signature, 'hex');
				expect(Buffer.from).to.be.calledWith(transaction.signSignature, 'hex');
				return expect(Buffer.from).to.be.calledWith(
					transaction.requesterPublicKey,
					'hex'
				);
			});

			it('should throw error if serialization to any attribute failed', () => {
				const block = seeder.getLastBlock();
				const transaction = new transactionsFixtures.Transaction({
					blockId: block.id,
				});
				transaction.senderPublicKey = 'ABFGH';

				return expect(db.transactions.save(transaction)).to.be.rejectedWith(
					'Argument must be a valid hex string'
				);
			});

			it('should execute all queries in one database transaction', done => {
				const block = seeder.getLastBlock();
				const transaction = new transactionsFixtures.Transaction({
					blockId: block.id,
				});

				db.$config.options.query = function(event) {
					if (
						!(
							event.ctx &&
							event.ctx.isTX &&
							event.ctx.txLevel === 0 &&
							event.ctx.tag === 'transactions:save'
						)
					) {
						done(
							`Some query executed outside transaction context: ${event.query}`,
							event
						);
					}
				};

				const connect = sinonSandbox.stub();
				const disconnect = sinonSandbox.stub();

				db.$config.options.connect = connect;
				db.$config.options.disconnect = disconnect;

				db.transactions.save(transaction).then(() => {
					expect(connect.calledOnce).to.be.true;
					expect(disconnect.calledOnce).to.be.true;

					delete db.$config.options.connect;
					delete db.$config.options.disconnect;
					delete db.$config.options.query;

					done();
				});
			});

			it('should call respective transaction type save function once for each transaction type', function*() {
				const block = seeder.getLastBlock();
				const transactions = [];
				Object.keys(transactionTypes).forEach(type => {
					transactions.push(
						new transactionsFixtures.Transaction({
							blockId: block.id,
							type: transactionTypes[type],
						})
					);
					// Create two transactions of each type to test respective transaction type
					//  save function called once for both transactions
					transactions.push(
						new transactionsFixtures.Transaction({
							blockId: block.id,
							type: transactionTypes[type],
						})
					);
				});

				return yield db.tx(function*(t) {
					sinonSandbox.spy(t['transactions.transfer'], 'save');
					sinonSandbox.spy(t['transactions.dapp'], 'save');
					sinonSandbox.spy(t['transactions.delegate'], 'save');
					sinonSandbox.spy(t['transactions.inTransfer'], 'save');
					sinonSandbox.spy(t['transactions.outTransfer'], 'save');
					sinonSandbox.spy(t['transactions.multisignature'], 'save');
					sinonSandbox.spy(t['transactions.signature'], 'save');
					sinonSandbox.spy(t['transactions.vote'], 'save');

					yield t.transactions.save(transactions);

					// Expect that each transaction type save function called once
					// with two transactions that we created above

					expect(t['transactions.transfer'].save).to.be.calledOnce;
					expect(
						t['transactions.transfer'].save.firstCall.args[0]
					).to.have.lengthOf(2);

					expect(t['transactions.dapp'].save).to.be.calledOnce;
					expect(
						t['transactions.dapp'].save.firstCall.args[0]
					).to.have.lengthOf(2);

					expect(t['transactions.delegate'].save).to.be.calledOnce;
					expect(
						t['transactions.delegate'].save.firstCall.args[0]
					).to.have.lengthOf(2);

					expect(t['transactions.inTransfer'].save).to.be.calledOnce;
					expect(
						t['transactions.inTransfer'].save.firstCall.args[0]
					).to.have.lengthOf(2);

					expect(t['transactions.outTransfer'].save).to.be.calledOnce;
					expect(
						t['transactions.outTransfer'].save.firstCall.args[0]
					).to.have.lengthOf(2);

					expect(t['transactions.multisignature'].save).to.be.calledOnce;
					expect(
						t['transactions.multisignature'].save.firstCall.args[0]
					).to.have.lengthOf(2);

					expect(t['transactions.signature'].save).to.be.calledOnce;
					expect(
						t['transactions.signature'].save.firstCall.args[0]
					).to.have.lengthOf(2);

					expect(t['transactions.vote'].save).to.be.calledOnce;
					expect(
						t['transactions.vote'].save.firstCall.args[0]
					).to.have.lengthOf(2);
				});
			});
		});
	});
});
