/* eslint-disable mocha/no-pending-tests */
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

const { BaseEntity, Transaction } = require('../../../../storage/entities');
const storageSandbox = require('../../../common/storage_sandbox');
const seeder = require('../../../common/storage_seed');
const transactionsFixtures = require('../../../fixtures').transactions;
const transactionTypes = require('../../../../helpers/transaction_types');

const numSeedRecords = 5;

const expectValidTransactionRow = (row, transaction) => {
	expect(row.id).to.be.eql(transaction.id);
	expect(row.blockId).to.be.eql(transaction.blockId);
	expect(row.type).to.be.eql(transaction.type);
	expect(row.timestamp).to.be.eql(transaction.timestamp);
	expect(row.senderPublicKey).to.be.eql(
		Buffer.from(transaction.senderPublicKey, 'hex')
	);
	expect(row.requesterPublicKey).to.be.eql(
		Buffer.from(transaction.requesterPublicKey, 'hex')
	);
	expect(row.senderId).to.be.eql(transaction.senderId);
	expect(row.recipientId).to.be.eql(transaction.recipientId);
	expect(row.amount).to.be.eql(transaction.amount);
	expect(row.fee).to.be.eql(transaction.fee);
	expect(row.signature).to.be.eql(Buffer.from(transaction.signature, 'hex'));
	expect(row.signSignature).to.be.eql(
		Buffer.from(transaction.signSignature, 'hex')
	);
	expect(row.signatures).to.be.eql(transaction.signatures.join());
};

describe('Transaction', () => {
	let adapter;
	let storage;
	let validTransactionSQLs;
	let addFieldSpy;

	before(async () => {
		storage = new storageSandbox.StorageSandbox(
			__testContext.config.db,
			'lisk_test_transactions'
		);
		await storage.bootstrap();

		validTransactionSQLs = [
			'select',
			'selectExtended',
			'create',
			'isPersisted',
			'count',
		];

		adapter = storage.adapter;
		addFieldSpy = sinonSandbox.spy(Transaction.prototype, 'addField');
	});

	beforeEach(() => {
		return seeder.seed(storage);
	});

	afterEach(() => {
		sinonSandbox.reset();
		return seeder.reset(storage);
	});

	it('should be a constructable function', async () => {
		expect(Transaction.prototype.constructor).not.to.be.null;
		expect(Transaction.prototype.constructor.name).to.be.eql('Transaction');
	});

	it('should extend BaseEntity', async () => {
		expect(Transaction.prototype instanceof BaseEntity).to.be.true;
	});

	describe('constructor()', () => {
		it('should accept only one mandatory parameter', async () => {
			expect(Transaction.prototype.constructor.length).to.be.eql(1);
		});

		it('should have called super', async () => {
			// The reasoning here is that if the parent's contstructor was called
			// the properties from the parent are present in the extending object
			const transaction = new Transaction(adapter);
			expect(typeof transaction.parseFilters).to.be.eql('function');
			expect(typeof transaction.addFilter).to.be.eql('function');
			expect(typeof transaction.addField).to.be.eql('function');
			expect(typeof transaction.getFilters).to.be.eql('function');
			expect(typeof transaction.getUpdateSet).to.be.eql('function');
			expect(typeof transaction.getValuesSet).to.be.eql('function');
			expect(typeof transaction.begin).to.be.eql('function');
			expect(typeof transaction.validateFilters).to.be.eql('function');
			expect(typeof transaction.validateOptions).to.be.eql('function');
		});

		it('should assign proper sql', async () => {
			const transaction = new Transaction(adapter);
			expect(transaction.SQLs).to.include.all.keys(validTransactionSQLs);
		});

		it('should call addField the exact number of times', async () => {
			const transaction = new Transaction(adapter);
			expect(addFieldSpy.callCount).to.eql(
				Object.keys(transaction.fields).length
			);
		});

		it('should setup specific filters');
	});

	describe('create()', () => {
		it('should save single transaction', async () => {
			const block = seeder.getLastBlock();
			const transaction = new transactionsFixtures.Transaction({
				blockId: block.id,
			});
			let result = await storage.entities.Transaction.create(transaction);

			expect(result).to.be.eql(true);

			result = await storage.adapter.execute('SELECT * from trs');

			expect(result).to.not.empty;
			expect(result).to.have.lengthOf(1);
			expectValidTransactionRow(result[0], transaction);
		});

		it('should save multiple transactions', async () => {
			const block = seeder.getLastBlock();
			const transaction1 = new transactionsFixtures.Transaction({
				blockId: block.id,
			});
			const transaction2 = new transactionsFixtures.Transaction({
				blockId: block.id,
			});
			let result = await storage.entities.Transaction.create([
				transaction1,
				transaction2,
			]);

			expect(result).to.be.eql(true);

			result = await storage.adapter.execute('SELECT * from trs');

			expect(result).to.not.empty;
			expect(result).to.have.lengthOf(2);
			expectValidTransactionRow(result[0], transaction1);
			expectValidTransactionRow(result[1], transaction2);
		});

		it('should throw error if serialization to any attribute failed', async () => {
			const block = seeder.getLastBlock();
			const transaction = new transactionsFixtures.Transaction({
				blockId: block.id,
			});
			transaction.senderPublicKey = 'ABFGH';

			return expect(
				storage.entities.Transaction.create(transaction)
			).to.be.rejectedWith('invalid hexadecimal digit: "G"');
		});

		it('should execute all queries in one database transaction', async () => {
			const block = seeder.getLastBlock();
			const transaction = new transactionsFixtures.Transaction({
				blockId: block.id,
			});

			storage.adapter.db.$config.options.query = function(event) {
				if (
					!(
						event.ctx &&
						event.ctx.isTX &&
						event.ctx.txLevel === 0 &&
						event.ctx.tag === 'transactions:create'
					)
				) {
					throw (`Some query executed outside transaction context: ${
						event.query
					}`,
					event);
				}
			};

			const connect = sinonSandbox.stub();
			const disconnect = sinonSandbox.stub();

			storage.adapter.db.$config.options.connect = connect;
			storage.adapter.db.$config.options.disconnect = disconnect;

			await storage.entities.Transaction.create(transaction);
			expect(connect.calledOnce).to.be.true;
			expect(disconnect.calledOnce).to.be.true;

			delete storage.adapter.db.$config.options.connect;
			delete storage.adapter.db.$config.options.disconnect;
			delete storage.adapter.db.$config.options.query;
		});

		it('should create respective transaction type once for each transaction type', async () => {
			const block = seeder.getLastBlock();
			const transactions = [];
			// Create two transactions of each type to test respective transaction type
			//  save function called once for both transactions

			Object.keys(transactionTypes).forEach(type => {
				transactions.push(
					new transactionsFixtures.Transaction({
						blockId: block.id,
						type: transactionTypes[type],
					})
				);
				transactions.push(
					new transactionsFixtures.Transaction({
						blockId: block.id,
						type: transactionTypes[type],
					})
				);
			});

			const _createSubTransactionsSpy = sinonSandbox.spy(
				storage.entities.Transaction,
				'_createSubTransactions'
			);

			await storage.entities.Transaction.create(transactions);

			// Expect that _createSubTransactions was called once for each transaction type
			// with two transactions that we created above
			expect(_createSubTransactionsSpy).to.have.callCount(8);

			// Make sure each call contains proper arguments
			[0, 1, 2, 3, 4, 5, 6, 7].forEach(i => {
				expect(_createSubTransactionsSpy.getCall(i).args[0]).to.be.eql(i);
				expect(_createSubTransactionsSpy.getCall(i).args[1]).to.have.lengthOf(
					2
				);
				_createSubTransactionsSpy
					.getCall(i)
					.args[1].forEach(t => expect(t.type).to.be.eql(i));
			});
		});

		it('should insert entry into "transfer" table for type 0 transactions', async () => {
			const block = seeder.getLastBlock();
			const transactions = [];
			for (let i = 0; i < numSeedRecords; i++) {
				transactions.push(
					new transactionsFixtures.Transaction({
						blockId: block.id,
						type: transactionTypes.SEND,
					})
				);
			}
			await storage.entities.Transaction.create(transactions);

			const result = await storage.adapter.execute('SELECT * FROM transfer');

			expect(result).to.not.empty;
			expect(result).to.have.lengthOf(numSeedRecords);
			expect(result.map(r => Buffer.from(r.data).toString())).to.be.eql(
				transactions.map(t => t.asset.data)
			);
			expect(result.map(r => r.transactionId)).to.be.eql(
				transactions.map(t => t.id)
			);
		});

		it('should insert entry into "signatures" table for type 1 transactions', async () => {
			const block = seeder.getLastBlock();
			const transactions = [];
			for (let i = 0; i < numSeedRecords; i++) {
				transactions.push(
					new transactionsFixtures.Transaction({
						blockId: block.id,
						type: transactionTypes.SIGNATURE,
					})
				);
			}
			await storage.entities.Transaction.create(transactions);

			const result = await storage.adapter.execute('SELECT * FROM signatures');

			expect(result).to.not.empty;
			expect(result).to.have.lengthOf(numSeedRecords);
			expect(
				result.map(r => Buffer.from(r.publicKey).toString('hex'))
			).to.be.eql(transactions.map(t => t.asset.signature.publicKey));
			expect(result.map(r => r.transactionId)).to.be.eql(
				transactions.map(t => t.id)
			);
		});

		it('should insert entry into "delegates" table for type 2 transactions', async () => {
			const block = seeder.getLastBlock();
			const transactions = [];
			for (let i = 0; i < numSeedRecords; i++) {
				transactions.push(
					new transactionsFixtures.Transaction({
						blockId: block.id,
						type: transactionTypes.DELEGATE,
					})
				);
			}
			await storage.entities.Transaction.create(transactions);

			const result = await storage.adapter.execute('SELECT * FROM delegates');

			expect(result).to.not.empty;
			expect(result).to.have.lengthOf(numSeedRecords);
			expect(result.map(r => r.transactionId)).to.be.eql(
				transactions.map(t => t.id)
			);
			expect(
				result.map(r => {
					delete r.transactionId;
					return r;
				})
			).to.be.eql(transactions.map(t => t.asset.delegate));
		});

		it('should insert entry into "votes" table for type 3 transactions', async () => {
			const block = seeder.getLastBlock();
			const transactions = [];
			for (let i = 0; i < numSeedRecords; i++) {
				transactions.push(
					new transactionsFixtures.Transaction({
						blockId: block.id,
						type: transactionTypes.VOTE,
					})
				);
			}
			await storage.entities.Transaction.create(transactions);

			const result = await storage.adapter.execute('SELECT * FROM votes');

			expect(result).to.not.empty;
			expect(result).to.have.lengthOf(numSeedRecords);
			expect(result.map(r => r.votes)).to.be.eql(
				transactions.map(t => t.asset.votes.join())
			);
			expect(result.map(r => r.transactionId)).to.be.eql(
				transactions.map(t => t.id)
			);
		});

		it('should insert entry into "multisignatures" table for type 4 transactions', async () => {
			const block = seeder.getLastBlock();
			const transactions = [];
			for (let i = 0; i < numSeedRecords; i++) {
				transactions.push(
					new transactionsFixtures.Transaction({
						blockId: block.id,
						type: transactionTypes.MULTI,
					})
				);
			}
			await storage.entities.Transaction.create(transactions);

			const result = await storage.adapter.execute(
				'SELECT * FROM multisignatures'
			);

			expect(result).to.not.empty;
			expect(result).to.have.lengthOf(numSeedRecords);
			expect(result.map(r => r.min)).to.be.eql(
				transactions.map(t => t.asset.multisignature.min)
			);
			expect(result.map(r => r.lifetime)).to.be.eql(
				transactions.map(t => t.asset.multisignature.lifetime)
			);
			expect(result.map(r => r.keysgroup)).to.be.eql(
				transactions.map(t => t.asset.multisignature.keysgroup.join())
			);
			expect(result.map(r => r.transactionId)).to.be.eql(
				transactions.map(t => t.id)
			);
		});

		it('should insert entry into "dapps" table for type 5 transactions', async () => {
			const block = seeder.getLastBlock();
			const transactions = [];
			for (let i = 0; i < numSeedRecords; i++) {
				transactions.push(
					new transactionsFixtures.Transaction({
						blockId: block.id,
						type: transactionTypes.DAPP,
					})
				);
			}
			await storage.entities.Transaction.create(transactions);

			const result = await storage.adapter.execute('SELECT * FROM dapps');

			expect(result).to.not.empty;
			expect(result).to.have.lengthOf(numSeedRecords);
			expect(result.map(r => r.transactionId)).to.be.eql(
				transactions.map(t => t.id)
			);
			expect(result).to.be.eql(transactions.map(t => t.asset.dapp));
		});

		it('should insert entry into "intransfer" table for type 6 transactions', async () => {
			const block = seeder.getLastBlock();
			const transactions = [];
			for (let i = 0; i < numSeedRecords; i++) {
				transactions.push(
					new transactionsFixtures.Transaction({
						blockId: block.id,
						type: transactionTypes.IN_TRANSFER,
					})
				);
			}
			await storage.entities.Transaction.create(transactions);

			const result = await storage.adapter.execute('SELECT * FROM intransfer');

			expect(result).to.not.empty;
			expect(result).to.have.lengthOf(numSeedRecords);
			expect(result.map(r => r.transactionId)).to.be.eql(
				transactions.map(t => t.id)
			);
			expect(result.map(r => r.dappId)).to.be.eql(
				transactions.map(t => t.asset.inTransfer.dappId)
			);
		});

		it('should insert entry into "outtransfer" table for type 7 transactions', async () => {
			const block = seeder.getLastBlock();
			const transactions = [];
			for (let i = 0; i < numSeedRecords; i++) {
				transactions.push(
					new transactionsFixtures.Transaction({
						blockId: block.id,
						type: transactionTypes.OUT_TRANSFER,
					})
				);
			}
			await storage.entities.Transaction.create(transactions);

			const result = await storage.adapter.execute('SELECT * FROM outtransfer');

			expect(result).to.not.empty;
			expect(result).to.have.lengthOf(numSeedRecords);
			expect(result.map(r => r.transactionId)).to.be.eql(
				transactions.map(t => t.id)
			);
			expect(result.map(r => r.dappId)).to.be.eql(
				transactions.map(t => t.asset.outTransfer.dappId)
			);
			expect(result.map(r => r.outTransactionId)).to.be.eql(
				transactions.map(t => t.asset.outTransfer.transactionId)
			);
		});
	});
});
