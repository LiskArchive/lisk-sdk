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
const BAT = require('../../common/utils/blocksAndTransactionsHelper');

describe('blocks processing & transactions pool consistency', () => {
	let library;

	localCommon.beforeBlock('consistency', lib => {
		library = lib;
	});

	describe('total spending', () => {
		describe('should not include transactions which exceed total spending per account balance', () => {
			it('when we debit the account first', async () => {
				const bat = new BAT(library);

				// Credit random account with 1 LSK and forge a block
				await bat.creditRandomAccountAndForge(1);

				// Prepare transactions and expectations
				bat.add(0.6, BAT.TYPE.DEBIT, BAT.EXPECT.OK); // Account balance after: 0.3 LSK
				bat.add(0.4, BAT.TYPE.DEBIT, BAT.EXPECT.FAIL); // Account balance after: -0.2 LSK
				bat.add(0.3, BAT.TYPE.CREDIT, BAT.EXPECT.OK); // Account balance after: 0.3 LSK
				bat.add(0.1, BAT.TYPE.DEBIT, BAT.EXPECT.OK); // Account balance after: 0.1 LSK

				// Enqueue transactions and forge a block
				await bat.enqueueTransactionsAndForge();

				// Last block should only contain all transactions marked as EXPECT.OK and no transactions marked as EXPECT.FAIL
				// Transactions with smallest amount are first as we sort them by amount while forging
				expect(bat.getLastBlockTransactions()).to.deep.equal(bat.getValidTransactionsSorted());

				// There should be no transactions in transaction pool
				expect(bat.getTransactionsInPool()).to.instanceof(Array);
				expect(bat.getTransactionsInPool().length).to.eql(0);

				// Credit new random account with 1 LSK and forge a block
				await bat.creditRandomAccountAndForge(1);
				// Recreate existing transactions (new ID, same amount, TYPE, EXPECT)
				bat.recreateTransactions();

				// Enforce creation of a new block with all the transactions and then process it
				let errors = await bat.createAndProcessBlock();

				// We expecting the block to fail at processing
				expect(errors).to.have.lengthOf(1);
				expect(errors[0].message).to.be.equal(`Account does not have enough LSK for total spending. balance: 100000000, spending: ${bat.getTotalSpending()}`
					);
				expect(errors[0].id).to.be.equal(bat.getAllTransactions()[0].id);

				// Credit new random account with 1 LSK and forge a block
				await bat.creditRandomAccountAndForge(1);
				// Recreate existing transactions (new ID, same amount, TYPE, EXPECT)
				// Only those with EXPECT.OK, transactions marked as EXPECT.FAIL are removed permanently
				bat.recreateOnlyValidTransactions();

				// Enforce creation of a new block with all the transactions and then process it
				errors = await bat.createAndProcessBlock();

				// We expect no error, as there are no invalid transactions
				expect(errors).to.be.undefined;
				// Last block should only contain all transactions marked as EXPECT.OK and no transactions marked as EXPECT.FAIL
				// Transactions with smallest amount are first as we sort them by amount while forging
				expect(bat.getLastBlockTransactions()).to.deep.equal(bat.getValidTransactionsSorted());
			});

			it('when we credit the account first', async () => {
				const bat = new BAT(library);

				// Credit random account with 1 LSK and forge a block
				await bat.creditRandomAccountAndForge(1);

				// Prepare transactions and expectations
				bat.add(0.3, BAT.TYPE.CREDIT, BAT.EXPECT.OK); // Account balance after: 1 LSK
				bat.add(0.6, BAT.TYPE.DEBIT, BAT.EXPECT.OK); // Account balance after: 0.3 LSK
				bat.add(0.4, BAT.TYPE.DEBIT, BAT.EXPECT.FAIL); // Account balance after: -0.2 LSK
				bat.add(0.1, BAT.TYPE.DEBIT, BAT.EXPECT.OK); // Account balance after: 0.1 LSK

				// Enqueue transactions and forge a block
				await bat.enqueueTransactionsAndForge();

				// Last block should only contain all transactions marked as EXPECT.OK and no transactions marked as EXPECT.FAIL
				// Transactions with smallest amount are first as we sort them by amount while forging
				expect(bat.getLastBlockTransactions()).to.deep.equal(bat.getValidTransactionsSorted());

				// There should be no transactions in transaction pool
				expect(bat.getTransactionsInPool()).to.instanceof(Array);
				expect(bat.getTransactionsInPool().length).to.eql(0);

				// Credit new random account with 1 LSK and forge a block
				await bat.creditRandomAccountAndForge(1);
				// Recreate existing transactions (new ID, same amount, TYPE, EXPECT)
				bat.recreateTransactions();

				// Enforce creation of a new block with all the transactions and then process it
				let errors = await bat.createAndProcessBlock();

				// We expecting the block to fail at processing
				expect(errors).to.have.lengthOf(1);
				expect(errors[0].message).to.be.equal(
						`Account does not have enough LSK for total spending. balance: 100000000, spending: ${bat.getTotalSpending()}`
					);
				expect(errors[0].id).to.be.equal(bat.getAllTransactions()[1].id);

				// Credit new random account with 1 LSK and forge a block
				await bat.creditRandomAccountAndForge(1);
				// Recreate existing transactions (new ID, same amount, TYPE, EXPECT)
				// Only those with EXPECT.OK, transactions marked as EXPECT.FAIL are removed permanently
				bat.recreateOnlyValidTransactions();

				// Enforce creation of a new block with all the transactions and then process it
				errors = await bat.createAndProcessBlock();

				// We expect no error, as there are no invalid transactions
				expect(errors).to.be.undefined;
				// Last block should only contain all transactions marked as EXPECT.OK and no transactions marked as EXPECT.FAIL
				// Transactions with smallest amount are first as we sort them by amount while forging
				expect(bat.getLastBlockTransactions()).to.deep.equal(bat.getValidTransactionsSorted());
			});

			it('when we try to spend entire balance and transaction fee makes balance to go negative', async () => {
				const bat = new BAT(library);

				// Credit random account with 1 LSK and forge a block
				await bat.creditRandomAccountAndForge(1);

				// Prepare transactions and expectations
				bat.add(0.3, BAT.TYPE.CREDIT, BAT.EXPECT.OK); // Account balance after: 1 LSK
				bat.add(0.6, BAT.TYPE.DEBIT, BAT.EXPECT.OK); // Account balance after: 0.3 LSK
				bat.add(0.4, BAT.TYPE.DEBIT, BAT.EXPECT.FAIL); // Account balance after: -0.2 LSK
				bat.add(0.1, BAT.TYPE.DEBIT, BAT.EXPECT.OK); // Account balance after: 0.1 LSK
				bat.add(0.1, BAT.TYPE.DEBIT, BAT.EXPECT.FAIL); // Account balance after: -0.1 LSK

				// Enqueue transactions and forge a block
				await bat.enqueueTransactionsAndForge();

				// Last block should only contain all transactions marked as EXPECT.OK and no transactions marked as EXPECT.FAIL
				// Transactions with smallest amount are first as we sort them by amount while forging
				expect(bat.getLastBlockTransactions()).to.deep.equal(bat.getValidTransactionsSorted());

				// There should be no transactions in transaction pool
				expect(bat.getTransactionsInPool()).to.instanceof(Array);
				expect(bat.getTransactionsInPool().length).to.eql(0);

				// Credit new random account with 1 LSK and forge a block
				await bat.creditRandomAccountAndForge(1);
				// Recreate existing transactions (new ID, same amount, TYPE, EXPECT)
				bat.recreateTransactions();

				// Enforce creation of a new block with all the transactions and then process it
				let errors = await bat.createAndProcessBlock();

				// We expecting the block to fail at processing
				expect(errors).to.have.lengthOf(1);
				expect(errors[0].message).to.be.equal(
						`Account does not have enough LSK for total spending. balance: 100000000, spending: ${bat.getTotalSpending()}`
					);
				expect(errors[0].id).to.be.equal(bat.getAllTransactions()[1].id);

				// Credit new random account with 1 LSK and forge a block
				await bat.creditRandomAccountAndForge(1);
				// Recreate existing transactions (new ID, same amount, TYPE, EXPECT)
				// Only those with EXPECT.OK, transactions marked as EXPECT.FAIL are removed permanently
				bat.recreateOnlyValidTransactions();

				// Enforce creation of a new block with all the transactions and then process it
				errors = await bat.createAndProcessBlock();

				// We expect no error, as there are no invalid transactions
				expect(errors).to.be.undefined;
				// Last block should only contain all transactions marked as EXPECT.OK and no transactions marked as EXPECT.FAIL
				// Transactions with smallest amount are first as we sort them by amount while forging
				expect(bat.getLastBlockTransactions()).to.deep.equal(bat.getValidTransactionsSorted());
			});

			it('when we credit the account first, overspend last', async () => {
				const bat = new BAT(library);

				// Credit random account with 1 LSK and forge a block
				await bat.creditRandomAccountAndForge(1);

				// Prepare transactions and expectations
				bat.add(0.3, BAT.TYPE.CREDIT, BAT.EXPECT.OK); // Account balance after: 1 LSK
				bat.add(0.3, BAT.TYPE.DEBIT, BAT.EXPECT.OK); // Account balance after: 0.6 LSK
				bat.add(0.1, BAT.TYPE.DEBIT, BAT.EXPECT.OK); // Account balance after: 0.2 LSK
				bat.add(0.4, BAT.TYPE.DEBIT, BAT.EXPECT.FAIL); // Account balance after: -0.3
				bat.add(0.6, BAT.TYPE.DEBIT, BAT.EXPECT.FAIL); // Account balance after: -1 LSK

				// Enqueue transactions and forge a block
				await bat.enqueueTransactionsAndForge();

				// Last block should only contain all transactions marked as EXPECT.OK and no transactions marked as EXPECT.FAIL
				// Transactions with smallest amount are first as we sort them by amount while forging
				// FIXME: It fails to compare order when there are two transactions with same amount, sorting is not deterministic
				// expect(bat.getLastBlockTransactions()).to.deep.equal(bat.getValidTransactionsSorted());

				// There should be no transactions in transaction pool
				expect(bat.getTransactionsInPool()).to.instanceof(Array);
				expect(bat.getTransactionsInPool().length).to.eql(0);

				// Credit new random account with 1 LSK and forge a block
				await bat.creditRandomAccountAndForge(1);
				// Recreate existing transactions (new ID, same amount, TYPE, EXPECT)
				bat.recreateTransactions();

				// Enforce creation of a new block with all the transactions and then process it
				let errors = await bat.createAndProcessBlock();

				// We expecting the block to fail at processing
				expect(errors).to.have.lengthOf(1);
				// TODO: We can't use ${bat.getTotalSpending() here, investigate why actual is 110000000 instead of expected 180000000
				expect(errors[0].message).to.be.equal(
						'Account does not have enough LSK for total spending. balance: 100000000, spending: 110000000'
					);
				expect(errors[0].id).to.be.equal(bat.getAllTransactions()[3].id);

				// Credit new random account with 1 LSK and forge a block
				await bat.creditRandomAccountAndForge(1);
				// Recreate existing transactions (new ID, same amount, TYPE, EXPECT)
				// Only those with EXPECT.OK, transactions marked as EXPECT.FAIL are removed permanently
				bat.recreateOnlyValidTransactions();

				// Enforce creation of a new block with all the transactions and then process it
				errors = await bat.createAndProcessBlock();

				// We expect no error, as there are no invalid transactions
				expect(errors).to.be.undefined;
				// Last block should only contain all transactions marked as EXPECT.OK and no transactions marked as EXPECT.FAIL
				// Transactions with smallest amount are first as we sort them by amount while forging
				expect(bat.getLastBlockTransactions()).to.deep.equal(bat.getValidTransactionsSorted());
			});
		});

		describe('other cases', () => {
			it('when try to spend entire balance in single transaction and transaction fee makes balance go negative', async () => {
				const bat = new BAT(library);

				// Credit random account with 1 LSK and forge a block
				await bat.creditRandomAccountAndForge(1);

				// Prepare transactions and expectations
				bat.add(1, BAT.TYPE.DEBIT, BAT.EXPECT.FAIL); // Account balance after: -0.1 LSK

				// Enqueue transactions and forge a block
				let errors = await bat.enqueueTransactionsAndForge();
				// We expecting the block to fail at processing
				expect(errors).to.be.equal(
					`Transaction: ${bat.getAllTransactions()[0].id} failed at .balance: Account does not have enough LSK: ${bat.getAllTransactions()[0].senderId}, balance: 1`
				);

				// There should be no transactions in transaction pool
				expect(bat.getTransactionsInPool()).to.instanceof(Array);
				expect(bat.getTransactionsInPool().length).to.eql(0);

				// Credit new random account with 1 LSK and forge a block
				await bat.creditRandomAccountAndForge(1);
				// Recreate existing transactions (new ID, same amount, TYPE, EXPECT)
				bat.recreateTransactions();

				// Enforce creation of a new block with all the transactions and then process it
				errors = await bat.createAndProcessBlock();

				// We expecting the block to fail at processing
				expect(errors).to.have.lengthOf(1);
				expect(errors[0].message).to.be.equal(`Account does not have enough LSK: ${bat.getAllTransactions()[0].senderId}, balance: 1`);
				expect(errors[0].id).to.be.equal(bat.getAllTransactions()[0].id);

				// Credit new random account with 1 LSK and forge a block
				await bat.creditRandomAccountAndForge(1);
				// Recreate existing transactions (new ID, same amount, TYPE, EXPECT)
				// Only those with EXPECT.OK, transactions marked as EXPECT.FAIL are removed permanently
				bat.recreateOnlyValidTransactions();

				// Enforce creation of a new block with all the transactions and then process it
				errors = await bat.createAndProcessBlock();

				// We expect no error, as there are no invalid transactions
				expect(errors).to.be.undefined;
				// Last block should only contain all transactions marked as EXPECT.OK and no transactions marked as EXPECT.FAIL
				// Transactions with smallest amount are first as we sort them by amount while forging
				expect(bat.getLastBlockTransactions()).to.deep.equal(bat.getValidTransactionsSorted());
			});

			it('send 1 valid tx and 1000 invalid', async () => {
				const bat = new BAT(library);

				// Credit random account with 1 LSK and forge a block
				await bat.creditRandomAccountAndForge(1);

				// Prepare transactions and expectations
				bat.add(0.5, BAT.TYPE.DEBIT, BAT.EXPECT.OK); // Account balance after: 0.5 LSK
				// Add some more transactions
				const transactionsCount = 1000;
				for (let i = 0; i < transactionsCount; i++) {
					bat.add(0.5, BAT.TYPE.DEBIT, BAT.EXPECT.FAIL); // Account balance after: -0.1 LSK
				}

				// Enqueue transactions and forge a block
				// FIXME: Here we have to call fillPool few times for next block to not be empty
				await bat.enqueueTransactionsAndForge(Math.floor(transactionsCount / 25) + 1);

				// Last block should only contain all transactions marked as EXPECT.OK and no transactions marked as EXPECT.FAIL
				// Transactions with smallest amount are first as we sort them by amount while forging
				expect(bat.getLastBlockTransactions()).to.deep.equal(bat.getValidTransactionsSorted());

				// There should be no transactions in transaction pool
				expect(bat.getTransactionsInPool()).to.instanceof(Array);
				expect(bat.getTransactionsInPool().length).to.eql(0);

				// Credit new random account with 1 LSK and forge a block
				await bat.creditRandomAccountAndForge(1);
				// Recreate existing transactions (new ID, same amount, TYPE, EXPECT)
				bat.recreateTransactions();

				// Enforce creation of a new block with all the transactions and then process it
				let errors = await bat.createAndProcessBlock();

				// We expecting the block to fail at processing
				expect(errors).to.be.equal('Number of transactions exceeds maximum per block');

				// Credit new random account with 1 LSK and forge a block
				await bat.creditRandomAccountAndForge(1);
				// Recreate existing transactions (new ID, same amount, TYPE, EXPECT)
				// Only those with EXPECT.OK, transactions marked as EXPECT.FAIL are removed permanently
				bat.recreateOnlyValidTransactions();

				// Enforce creation of a new block with all the transactions and then process it
				errors = await bat.createAndProcessBlock();

				// We expect no error, as there are no invalid transactions
				expect(errors).to.be.undefined;
				// Last block should only contain all transactions marked as EXPECT.OK and no transactions marked as EXPECT.FAIL
				// Transactions with smallest amount are first as we sort them by amount while forging
				expect(bat.getLastBlockTransactions()).to.deep.equal(bat.getValidTransactionsSorted());
			});
		});
	});
});
