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

const localCommon = require('./../common');
const {
	BlocksTransactionsHelper,
	TYPE,
	EXPECT,
} = require('../../common/utils/blocks_and_transactions_helper');

describe('blocks processing & transactions pool consistency', () => {
	let library;

	localCommon.beforeBlock('blocks_transactions_processing', lib => {
		library = lib;
	});

	describe('total spending', () => {
		describe('when debit the account first', () => {
			it('should not include transactions which exceed total spending per account balance', async () => {
				const bat = new BlocksTransactionsHelper(library);

				// Credit random account with 1 LSK and forge a block
				await bat.initAccountAndCredit({ amount: 1 });

				// Prepare transactions and expectations
				bat.add(0.6, TYPE.SPEND, EXPECT.OK); // Account balance after: 0.3 LSK
				bat.add(0.4, TYPE.SPEND, EXPECT.FAIL); // Account balance after: -0.2 LSK
				bat.add(0.3, TYPE.RECEIVED, EXPECT.OK); // Account balance after: 0.3 LSK
				bat.add(0.1, TYPE.SPEND, EXPECT.OK); // Account balance after: 0.1 LSK

				// Enqueue transactions and forge a block
				await bat.enqueueAllTransactionsAndForge();

				// Last block should only contain all transactions marked as EXPECT.OK and no transactions marked as EXPECT.FAIL
				// Transactions with smallest amount are first as we sort them by amount while forging
				expect(bat.getTransactionsInLastBlock()).to.deep.equal(
					bat.getValidSortedTransactions(),
				);

				// 1.0 - (0.1 + 0.1) + 0.3 - (0.6 + 0.1)
				expect(await bat.getAccountBalance()).to.be.eql('0.4');

				// There should be no transactions in transaction pool
				expect(bat.getTransactionsInPool()).to.instanceof(Array);
				expect(bat.getTransactionsInPool()).to.lengthOf(0);

				// Credit new random account with 1 LSK and forge a block
				await bat.initAccountAndCredit({ amount: 1 });
				// Recreate existing transactions (new ID, same amount, TYPE, EXPECT)
				bat.recreateTransactions();

				// Enforce creation of a new block with all the transactions and then process it
				let errors = await bat.createAndProcessBlock();

				// We expecting the block to fail at processing
				expect(errors).to.have.lengthOf(1);
				expect(errors[0].message).to.be.equal(
					`Account does not have enough LSK for total spending. balance: 100000000, spending: ${bat.getTotalSpending()}`,
				);
				expect(errors[0].id).to.be.equal(bat.getAllTransactions()[0].id);

				// Credit new random account with 1 LSK and forge a block
				await bat.initAccountAndCredit({ amount: 1 });
				// Recreate existing transactions (new ID, same amount, TYPE, EXPECT)
				// Only those with EXPECT.OK, transactions marked as EXPECT.FAIL are removed permanently
				bat.recreateOnlyValidTransactions();

				// Enforce creation of a new block with all the transactions and then process it
				errors = await bat.createAndProcessBlock();

				// We expect no error, as there are no invalid transactions
				expect(errors).to.be.undefined;
				// Last block should only contain all transactions marked as EXPECT.OK and no transactions marked as EXPECT.FAIL
				// Transactions with smallest amount are first as we sort them by amount while forging
				expect(bat.getTransactionsInLastBlock()).to.deep.equal(
					bat.getValidSortedTransactions(),
				);
				// 1.0 - (0.1 + 0.1) + 0.3 - (0.6 + 0.1)
				expect(await bat.getAccountBalance()).to.be.eql('0.4');
			});
		});

		describe('when we credit the account first', () => {
			it('should not include transactions which exceed total spending per account balance', async () => {
				const bat = new BlocksTransactionsHelper(library);

				// Credit random account with 1 LSK and forge a block
				await bat.initAccountAndCredit({ amount: 1 });

				// Prepare transactions and expectations
				bat.add(0.3, TYPE.RECEIVED, EXPECT.OK); // Account balance after: 1 LSK
				bat.add(0.6, TYPE.SPEND, EXPECT.OK); // Account balance after: 0.3 LSK
				bat.add(0.4, TYPE.SPEND, EXPECT.FAIL); // Account balance after: -0.2 LSK
				bat.add(0.1, TYPE.SPEND, EXPECT.OK); // Account balance after: 0.1 LSK

				// Enqueue transactions and forge a block
				await bat.enqueueAllTransactionsAndForge();

				// Last block should only contain all transactions marked as EXPECT.OK and no transactions marked as EXPECT.FAIL
				// Transactions with smallest amount are first as we sort them by amount while forging
				expect(bat.getTransactionsInLastBlock()).to.deep.equal(
					bat.getValidSortedTransactions(),
				);
				// 1.0 - (0.1 + 0.1) + 0.3 - (0.6 + 0.1)
				expect(await bat.getAccountBalance()).to.be.eql('0.4');

				// There should be no transactions in transaction pool
				expect(bat.getTransactionsInPool()).to.instanceof(Array);
				expect(bat.getTransactionsInPool()).to.lengthOf(0);

				// Credit new random account with 1 LSK and forge a block
				await bat.initAccountAndCredit({ amount: 1 });
				// Recreate existing transactions (new ID, same amount, TYPE, EXPECT)
				bat.recreateTransactions();

				// Enforce creation of a new block with all the transactions and then process it
				let errors = await bat.createAndProcessBlock();

				// We expecting the block to fail at processing
				expect(errors).to.have.lengthOf(1);
				expect(errors[0].message).to.be.equal(
					`Account does not have enough LSK for total spending. balance: 100000000, spending: ${bat.getTotalSpending()}`,
				);
				expect(errors[0].id).to.be.equal(bat.getAllTransactions()[1].id);

				// Credit new random account with 1 LSK and forge a block
				await bat.initAccountAndCredit({ amount: 1 });
				// Recreate existing transactions (new ID, same amount, TYPE, EXPECT)
				// Only those with EXPECT.OK, transactions marked as EXPECT.FAIL are removed permanently
				bat.recreateOnlyValidTransactions();

				// Enforce creation of a new block with all the transactions and then process it
				errors = await bat.createAndProcessBlock();

				// We expect no error, as there are no invalid transactions
				expect(errors).to.be.undefined;
				// Last block should only contain all transactions marked as EXPECT.OK and no transactions marked as EXPECT.FAIL
				// Transactions with smallest amount are first as we sort them by amount while forging
				expect(bat.getTransactionsInLastBlock()).to.deep.equal(
					bat.getValidSortedTransactions(),
				);
				// 1.0 - (0.1 + 0.1) + 0.3 - (0.6 + 0.1)
				expect(await bat.getAccountBalance()).to.be.eql('0.4');
			});
		});

		describe('when we try to spend entire balance and transaction fee makes balance to go negative', () => {
			it('should not include transactions which exceed total spending per account balance', async () => {
				const bat = new BlocksTransactionsHelper(library);

				// Credit random account with 1 LSK and forge a block
				await bat.initAccountAndCredit({ amount: 1 });

				// Prepare transactions and expectations
				bat.add(0.3, TYPE.RECEIVED, EXPECT.OK); // Account balance after: 1 LSK
				bat.add(0.6, TYPE.SPEND, EXPECT.OK); // Account balance after: 0.3 LSK
				bat.add(0.4, TYPE.SPEND, EXPECT.FAIL); // Account balance after: -0.2 LSK
				bat.add(0.1, TYPE.SPEND, EXPECT.OK); // Account balance after: 0.1 LSK
				bat.add(0.1, TYPE.SPEND, EXPECT.FAIL); // Account balance after: -0.1 LSK

				// Enqueue transactions and forge a block
				await bat.enqueueAllTransactionsAndForge();

				// Last block should only contain all transactions marked as EXPECT.OK and no transactions marked as EXPECT.FAIL
				// Transactions with smallest amount are first as we sort them by amount while forging
				expect(bat.getTransactionsInLastBlock()).to.deep.equal(
					bat.getValidSortedTransactions(),
				);
				// 1.0 - (0.1 + 0.1) + 0.3 - (0.6 + 0.1)
				expect(await bat.getAccountBalance()).to.be.eql('0.4');

				// There should be no transactions in transaction pool
				expect(bat.getTransactionsInPool()).to.instanceof(Array);
				expect(bat.getTransactionsInPool()).to.lengthOf(0);

				// Credit new random account with 1 LSK and forge a block
				await bat.initAccountAndCredit({ amount: 1 });
				// Recreate existing transactions (new ID, same amount, TYPE, EXPECT)
				bat.recreateTransactions();

				// Enforce creation of a new block with all the transactions and then process it
				let errors = await bat.createAndProcessBlock();

				// We expecting the block to fail at processing
				expect(errors).to.have.lengthOf(1);
				expect(errors[0].message).to.be.equal(
					`Account does not have enough LSK for total spending. balance: 100000000, spending: ${bat.getTotalSpending()}`,
				);
				expect(errors[0].id).to.be.equal(bat.getAllTransactions()[1].id);

				// Credit new random account with 1 LSK and forge a block
				await bat.initAccountAndCredit({ amount: 1 });
				// Recreate existing transactions (new ID, same amount, TYPE, EXPECT)
				// Only those with EXPECT.OK, transactions marked as EXPECT.FAIL are removed permanently
				bat.recreateOnlyValidTransactions();

				// Enforce creation of a new block with all the transactions and then process it
				errors = await bat.createAndProcessBlock();

				// We expect no error, as there are no invalid transactions
				expect(errors).to.be.undefined;
				// Last block should only contain all transactions marked as EXPECT.OK and no transactions marked as EXPECT.FAIL
				// Transactions with smallest amount are first as we sort them by amount while forging
				expect(bat.getTransactionsInLastBlock()).to.deep.equal(
					bat.getValidSortedTransactions(),
				);
			});
		});

		describe('when we credit the account first, overspend last', () => {
			it('should not include transactions which exceed total spending per account balance', async () => {
				const bat = new BlocksTransactionsHelper(library);

				// Credit random account with 1 LSK and forge a block
				await bat.initAccountAndCredit({ amount: 1 });

				// Prepare transactions and expectations
				bat.add(0.3, TYPE.RECEIVED, EXPECT.OK); // Account balance after: 1 LSK
				bat.add(0.3, TYPE.SPEND, EXPECT.OK); // Account balance after: 0.6 LSK
				bat.add(0.1, TYPE.SPEND, EXPECT.OK); // Account balance after: 0.2 LSK
				bat.add(0.4, TYPE.SPEND, EXPECT.FAIL); // Account balance after: -0.3
				bat.add(0.6, TYPE.SPEND, EXPECT.FAIL); // Account balance after: -1 LSK

				// Enqueue transactions and forge a block
				await bat.enqueueAllTransactionsAndForge();

				// Last block should only contain all transactions marked as EXPECT.OK and no transactions marked as EXPECT.FAIL
				// Transactions with smallest amount are first as we sort them by amount while forging
				// FIXME: It fails to compare order when there are two transactions with same amount, sorting is not deterministic
				// expect(bat.getLastBlockTransactions()).to.deep.equal(bat.getValidTransactionsSorted());

				// There should be no transactions in transaction pool
				expect(bat.getTransactionsInPool()).to.instanceof(Array);
				expect(bat.getTransactionsInPool()).to.lengthOf(0);

				// Credit new random account with 1 LSK and forge a block
				await bat.initAccountAndCredit({ amount: 1 });
				// Recreate existing transactions (new ID, same amount, TYPE, EXPECT)
				bat.recreateTransactions();

				// Enforce creation of a new block with all the transactions and then process it
				let errors = await bat.createAndProcessBlock();

				// We expecting the block to fail at processing
				expect(errors).to.have.lengthOf(1);
				// TODO: We can't use ${bat.getTotalSpending() here, investigate why actual is 110000000 instead of expected 180000000
				expect(errors[0].message).to.be.equal(
					'Account does not have enough LSK for total spending. balance: 100000000, spending: 110000000',
				);
				expect(errors[0].id).to.be.equal(bat.getAllTransactions()[3].id);

				// Credit new random account with 1 LSK and forge a block
				await bat.initAccountAndCredit({ amount: 1 });
				// Recreate existing transactions (new ID, same amount, TYPE, EXPECT)
				// Only those with EXPECT.OK, transactions marked as EXPECT.FAIL are removed permanently
				bat.recreateOnlyValidTransactions();

				// Enforce creation of a new block with all the transactions and then process it
				errors = await bat.createAndProcessBlock();

				// We expect no error, as there are no invalid transactions
				expect(errors).to.be.undefined;
				// Last block should only contain all transactions marked as EXPECT.OK and no transactions marked as EXPECT.FAIL
				// Transactions with smallest amount are first as we sort them by amount while forging
				expect(bat.getTransactionsInLastBlock()).to.deep.equal(
					bat.getValidSortedTransactions(),
				);
			});
		});

		describe('when try to spend entire balance in single transaction and transaction fee makes balance go negative', () => {
			it('should not include transactions which exceed total spending per account balance', async () => {
				const bat = new BlocksTransactionsHelper(library);

				// Credit random account with 1 LSK and forge a block
				await bat.initAccountAndCredit({ amount: 1 });

				// Prepare transactions and expectations
				bat.add(1, TYPE.SPEND, EXPECT.FAIL); // Account balance after: -0.1 LSK

				// Enqueue transactions and forge a block
				let errors = await bat.enqueueAllTransactionsAndForge();
				// We expecting the block to fail at processing
				expect(errors).to.be.equal(
					`Transaction: ${
						bat.getAllTransactions()[0].id
					} failed at .balance: Account does not have enough LSK: ${
						bat.getAllTransactions()[0].senderId
					}, balance: 1`,
				);

				// There should be no transactions in transaction pool
				expect(bat.getTransactionsInPool()).to.instanceof(Array);
				expect(bat.getTransactionsInPool()).to.lengthOf(0);

				// Credit new random account with 1 LSK and forge a block
				await bat.initAccountAndCredit({ amount: 1 });
				// Recreate existing transactions (new ID, same amount, TYPE, EXPECT)
				bat.recreateTransactions();

				// Enforce creation of a new block with all the transactions and then process it
				errors = await bat.createAndProcessBlock();

				// We expecting the block to fail at processing
				expect(errors).to.have.lengthOf(1);
				expect(errors[0].message).to.be.equal(
					`Account does not have enough LSK: ${
						bat.getAllTransactions()[0].senderId
					}, balance: 1`,
				);
				expect(errors[0].id).to.be.equal(bat.getAllTransactions()[0].id);

				// Credit new random account with 1 LSK and forge a block
				await bat.initAccountAndCredit({ amount: 1 });
				// Recreate existing transactions (new ID, same amount, TYPE, EXPECT)
				// Only those with EXPECT.OK, transactions marked as EXPECT.FAIL are removed permanently
				bat.recreateOnlyValidTransactions();

				// Enforce creation of a new block with all the transactions and then process it
				errors = await bat.createAndProcessBlock();

				// We expect no error, as there are no invalid transactions
				expect(errors).to.be.undefined;
				// Last block should only contain all transactions marked as EXPECT.OK and no transactions marked as EXPECT.FAIL
				// Transactions with smallest amount are first as we sort them by amount while forging
				expect(bat.getTransactionsInLastBlock()).to.deep.equal(
					bat.getValidSortedTransactions(),
				);
			});
		});

		describe('when there is 1 valid tx and 99 invalid', () => {
			it('should forge block with only valid transactions', async () => {
				const bat = new BlocksTransactionsHelper(library);

				// Credit random account with 1 LSK and forge a block
				await bat.initAccountAndCredit({ amount: 1 });

				// Prepare transactions and expectations
				bat.add(0.5, TYPE.SPEND, EXPECT.OK); // Account balance after: 0.5 LSK

				// Add some more transactions
				const transactionsCount = 999;
				for (let i = 0; i < transactionsCount; i++) {
					bat.add(0.5, TYPE.SPEND, EXPECT.FAIL); // Account balance after: -0.1 LSK
				}

				// Enqueue transactions and forge a block
				await bat.enqueueAllTransactionsAndForge();

				// Last block should only contain all transactions marked as EXPECT.OK and no transactions marked as EXPECT.FAIL
				// Transactions with smallest amount are first as we sort them by amount while forging
				expect(bat.getTransactionsInLastBlock()).to.deep.equal(
					bat.getValidSortedTransactions(),
				);

				// 1.0 - (0.5 + 0.1)
				expect(await bat.getAccountBalance()).to.be.eql('0.4');

				// Valid transactions should be removed from the transaction pool
				expect(bat.isValidTransactionInPool()).to.false;

				// Rest
				bat.cleanTransactions();
				bat.add(0.1, TYPE.SPEND, EXPECT.OK);
				await bat.enqueueAllTransactionsAndForge();

				expect(bat.getTransactionsInLastBlock()).to.deep.equal(
					bat.getValidSortedTransactions(),
				);

				// 0.4 - (0.1 + 0.1) + 1.5
				expect(await bat.getAccountBalance()).to.be.eql('0.2');

				// Valid transactions should be removed from the transaction pool
				expect(bat.isValidTransactionInPool()).to.false;
			});
		});
	});
});
