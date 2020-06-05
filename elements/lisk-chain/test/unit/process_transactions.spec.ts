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
import {
	Status as TransactionStatus,
	BaseTransaction,
	TransactionResponse,
} from '@liskhq/lisk-transactions';

import { composeTransactionSteps } from '../../src/transactions/compose_transaction_steps';

describe('#composeTransactionSteps', () => {
	const testTransactions = ([
		{
			id: 'anId',
			type: 0,
		},
		{
			id: 'anotherId',
			type: 1,
		},
	] as unknown) as BaseTransaction[];

	const step1Response = [
		{
			id: 'anId',
			status: TransactionStatus.FAIL,
		},
	];

	const step2Response = [
		{
			id: 'anotherId',
			status: TransactionStatus.OK,
		},
	];

	const step1 = jest.fn().mockReturnValue(step1Response);
	const step2 = jest.fn().mockReturnValue(step2Response);
	const composedFunction = composeTransactionSteps(step1, step2);
	let result: ReadonlyArray<TransactionResponse>;

	beforeEach(async () => {
		result = await composedFunction(testTransactions, {} as any);
	});

	it('should return a combination of the result of executing both steps', () => {
		// Assert
		expect(result).toEqual([...step1Response, ...step2Response]);
	});

	it('should only pass successfull transactions to the next step', () => {
		// Assert
		expect(step2).toHaveBeenCalledWith([testTransactions[1]], {});
	});
});
