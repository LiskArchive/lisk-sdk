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
 *
 */

import {
	CheckerFunctionResponse,
	Status,
	checkTransactionsWithPassAndFail,
} from '../../src/check_transactions';
import { expect } from 'chai';
import * as transactionObjects from '../../fixtures/transactions.json';
import { wrapTransaction } from '../utils/add_transaction_functions';

describe('#checkTransactions', () => {
	const transactions = transactionObjects.map(wrapTransaction);
	const passedTransactions = transactions.slice(0, 2);
	const failedTransactions = transactions.slice(2, 5);
	const transactionsToCheck = [...passedTransactions, ...failedTransactions];
	const checkerFunctionResponse: CheckerFunctionResponse = {
		status: Status.FAIL,
		transactionsResponses: [
			{
				id: failedTransactions[0].id,
				status: Status.FAIL,
				errors: [new Error(), new Error()],
			},
			{
				id: failedTransactions[1].id,
				status: Status.FAIL,
				errors: [new Error(), new Error()],
			},
			{
				id: passedTransactions[0].id,
				status: Status.OK,
				errors: [],
			},
			{
				id: passedTransactions[1].id,
				status: Status.OK,
				errors: [],
			},
			{
				id: failedTransactions[2].id,
				status: Status.FAIL,
				errors: [new Error()],
			},
		],
	};

	let checkerFunction: sinon.SinonStub;

	describe('#checkTransactionWithPassAndFail', () => {
		beforeEach(async () => {
			checkerFunction = sandbox.stub().resolves(checkerFunctionResponse);
		});

		it('should call checkerFunction with the transactions passed', async () => {
			await checkTransactionsWithPassAndFail(
				transactionsToCheck,
				checkerFunction,
			);
			expect(checkerFunction).to.be.calledOnceWithExactly(transactionsToCheck);
		});

		it('should return transactions which passed the checkerFunction', async () => {
			const checkTransactionsResponse = await checkTransactionsWithPassAndFail(
				transactionsToCheck,
				checkerFunction,
			);
			expect(checkTransactionsResponse.passedTransactions).to.be.deep.equal(
				passedTransactions,
			);
		});

		it('should return transactions which failed the checkerFunction', async () => {
			const checkTransactionsResponse = await checkTransactionsWithPassAndFail(
				transactionsToCheck,
				checkerFunction,
			);
			expect(checkTransactionsResponse.failedTransactions).to.be.deep.equal(
				failedTransactions,
			);
		});
	});
});
