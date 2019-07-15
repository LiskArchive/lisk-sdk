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

const { Status: TransactionStatus } = require('@liskhq/lisk-transactions');
const {
	composeTransactionSteps,
} = require('../../../../../../src/modules/chain/transactions/compose_transaction_steps.js');

describe('process_transactions', () => {
	describe('#composeTransactionSteps', () => {
		const transactions = [
			{
				id: 'anId',
				matcher: () => true,
				type: 0,
			},
			{
				id: 'anotherId',
				matcher: () => false,
				type: 1,
			},
		];

		const step1Response = {
			transactionsResponses: [
				{
					id: 'id1',
					status: TransactionStatus.FAIL,
				},
			],
		};

		const step2Response = {
			transactionsResponses: [
				{
					id: 'id2',
					status: TransactionStatus.OK,
				},
			],
		};

		const step1 = sinonSandbox.stub().returns(step1Response);
		const step2 = sinonSandbox.stub().returns(step2Response);
		const composedFunction = composeTransactionSteps(step1, step2);
		let result;

		beforeEach(async () => {
			result = await composedFunction(transactions);
		});

		it('should return a combination of the result of executing both steps', async () => {
			// Assert
			expect(result).to.deep.equal({
				transactionsResponses: [
					...step1Response.transactionsResponses,
					...step2Response.transactionsResponses,
				],
			});
		});

		it('should only pass successfull transactions to the next step', async () => {
			// Assert
			expect(step2).to.have.been.calledWith([]);
		});
	});
});
