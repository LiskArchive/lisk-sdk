/* eslint-disable mocha/no-pending-tests */
/*
 * Copyright © 2019 Lisk Foundation
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

const {
	entities: { BaseEntity },
} = require('../../../../../../../../src/components/storage');
const {
	TransactionEntity: Transaction,
} = require('../../../../../../../../src/application/storage/entities');
const storageSandbox = require('../../../../../../../utils/storage/storage_sandbox');
const seeder = require('../../../../../../../utils/storage/storage_seed');
const transactionsFixtures = require('../../../../../../../fixtures')
	.transactions;

const TRANSACTION_TYPES = {
	SEND: 8,
	SIGNATURE: 9,
	DELEGATE: 10,
	VOTE: 11,
	MULTI: 12,
};

const numSeedRecords = 5;

const expectValidTransactionRow = (row, transaction) => {
	expect(row.id).to.be.eql(transaction.id);
	expect(row.blockId).to.be.eql(transaction.blockId);
	expect(row.type).to.be.eql(transaction.type);
	expect(row.timestamp).to.be.eql(transaction.timestamp);
	expect(row.senderPublicKey).to.be.eql(transaction.senderPublicKey);
	expect(row.senderId).to.be.eql(transaction.senderId);
	expect(row.asset.recipientId).to.be.eql(transaction.asset.recipientId);
	expect(row.asset.amount).to.be.eql(transaction.asset.amount);
	expect(row.fee).to.be.eql(transaction.fee);
	expect(row.signature).to.be.eql(transaction.signature);
	expect(row.signSignature).to.be.eql(transaction.signSignature);
	expect(row.signatures).to.be.eql(transaction.signatures);
};

describe('Transaction', () => {
	let adapter;
	let storage;
	let validTransactionSQLs;

	before(async () => {
		storage = new storageSandbox.StorageSandbox(
			__testContext.config.components.storage,
			'lisk_test_storage_custom_transaction_chain_module',
		);
		await storage.bootstrap();

		validTransactionSQLs = ['create'];

		adapter = storage.adapter;
	});

	beforeEach(() => {
		return seeder.seed(storage);
	});

	afterEach(async () => {
		sinonSandbox.reset();
		sinonSandbox.restore();
		return seeder.reset(storage);
	});

	it('should be a constructable function', async () => {
		expect(Transaction.prototype.constructor).not.to.be.null;
		expect(Transaction.prototype.constructor.name).to.be.eql(
			'ChainTransaction',
		);
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
	});

	describe('create()', () => {
		it('should save single transaction', async () => {
			const block = seeder.getLastBlock();
			const transaction = new transactionsFixtures.Transaction({
				blockId: block.id,
			});
			let result = await storage.entities.Transaction.create(transaction);
			result = await storage.entities.Transaction.get({ id: transaction.id });
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

			result = await storage.entities.Transaction.get({
				id_in: [transaction1.id, transaction2.id],
			});

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
				storage.entities.Transaction.create(transaction),
			).to.eventually.be.rejectedWith('invalid hexadecimal digit: "G"');
		});

		it('should populate asset field with "transfer" json for type 0 transactions', async () => {
			const block = seeder.getLastBlock();
			const transactions = [];
			for (let i = 0; i < numSeedRecords; i++) {
				transactions.push(
					new transactionsFixtures.Transaction({
						blockId: block.id,
						type: TRANSACTION_TYPES.SEND,
					}),
				);
			}
			await storage.entities.Transaction.create(transactions);
			const transactionIds = transactions.map(({ id }) => id);
			const result = await storage.entities.Transaction.get(
				{ id_in: transactionIds },
				{ extended: true },
			);

			expect(result).to.not.empty;
			expect(result).to.have.lengthOf(numSeedRecords);
			expect(result.map(r => r.id)).to.be.eql(transactions.map(t => t.id));
			expect(result.map(r => r.asset.data)).to.be.eql(
				transactions.map(t => t.asset.data),
			);
		});

		it('should populate asset field with "signatures" json for type 1 transactions', async () => {
			const block = seeder.getLastBlock();
			const transactions = [];
			for (let i = 0; i < numSeedRecords; i++) {
				transactions.push(
					new transactionsFixtures.Transaction({
						blockId: block.id,
						type: TRANSACTION_TYPES.SIGNATURE,
					}),
				);
			}
			await storage.entities.Transaction.create(transactions);
			const transactionIds = transactions.map(({ id }) => id);
			const result = await storage.entities.Transaction.get(
				{ id_in: transactionIds },
				{ extended: true },
			);

			expect(result).to.not.empty;
			expect(result).to.have.lengthOf(numSeedRecords);
			expect(result.map(r => r.id)).to.be.eql(transactions.map(t => t.id));
			expect(result.map(r => r.asset.signature)).to.be.eql(
				transactions.map(t => t.asset.signature),
			);
		});

		it('should populate asset field with "delegates" json for type 2 transactions', async () => {
			const block = seeder.getLastBlock();
			const transactions = [];
			for (let i = 0; i < numSeedRecords; i++) {
				transactions.push(
					new transactionsFixtures.Transaction({
						blockId: block.id,
						type: TRANSACTION_TYPES.DELEGATE,
					}),
				);
			}
			await storage.entities.Transaction.create(transactions);
			const transactionIds = transactions.map(({ id }) => id);
			const result = await storage.entities.Transaction.get(
				{ id_in: transactionIds },
				{ extended: true },
			);

			expect(result).to.not.empty;
			expect(result).to.have.lengthOf(numSeedRecords);
			expect(result.map(r => r.id)).to.be.eql(transactions.map(t => t.id));
			expect(result.map(r => r.asset.delegate)).to.be.eql(
				transactions.map(t => t.asset.delegate),
			);
		});

		it('should populate asset field with "votes" json for type 3 transactions', async () => {
			const block = seeder.getLastBlock();
			const transactions = [];
			for (let i = 0; i < numSeedRecords; i++) {
				transactions.push(
					new transactionsFixtures.Transaction({
						blockId: block.id,
						type: TRANSACTION_TYPES.VOTE,
					}),
				);
			}
			await storage.entities.Transaction.create(transactions);
			const transactionIds = transactions.map(({ id }) => id);
			const result = await storage.entities.Transaction.get(
				{ id_in: transactionIds },
				{ extended: true },
			);

			expect(result).to.not.empty;
			expect(result).to.have.lengthOf(numSeedRecords);
			expect(result.map(r => r.id)).to.be.eql(transactions.map(t => t.id));
			expect(result.map(r => r.asset.votes)).to.be.eql(
				transactions.map(t => t.asset.votes),
			);
		});

		it('should populate asset field with "multisignatures" json for type 4 transactions', async () => {
			const block = seeder.getLastBlock();
			const transactions = [];
			for (let i = 0; i < numSeedRecords; i++) {
				transactions.push(
					new transactionsFixtures.Transaction({
						blockId: block.id,
						type: TRANSACTION_TYPES.MULTI,
					}),
				);
			}
			await storage.entities.Transaction.create(transactions);
			const transactionIds = transactions.map(({ id }) => id);
			const result = await storage.entities.Transaction.get(
				{ id_in: transactionIds },
				{ extended: true },
			);

			expect(result).to.not.empty;
			expect(result).to.have.lengthOf(numSeedRecords);
			expect(result.map(r => r.id)).to.be.eql(transactions.map(t => t.id));
			expect(result.map(r => r.asset.multisignature)).to.be.eql(
				transactions.map(t => t.asset.multisignature),
			);
		});

		it('should populate asset field with "dapps" json for type 5 transactions', async () => {
			const block = seeder.getLastBlock();
			const transactions = [];
			for (let i = 0; i < numSeedRecords; i++) {
				transactions.push(
					new transactionsFixtures.Transaction({
						blockId: block.id,
						type: TRANSACTION_TYPES.DAPP,
					}),
				);
			}
			await storage.entities.Transaction.create(transactions);
			const transactionIds = transactions.map(({ id }) => id);
			const result = await storage.entities.Transaction.get(
				{ id_in: transactionIds },
				{ extended: true },
			);

			expect(result).to.not.empty;
			expect(result).to.have.lengthOf(numSeedRecords);
			expect(result.map(r => r.id)).to.be.eql(transactions.map(t => t.id));
			expect(result.map(t => t.asset.dapp)).to.be.eql(
				transactions.map(t => t.asset.dapp),
			);
		});
	});
});
