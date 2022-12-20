/*
 * Copyright © 2020 Lisk Foundation
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

import { LiskValidationError, validator } from '@liskhq/lisk-validator';
import { baseTransactionSchema } from './schema';

/**
 * Validates a given transaction against their schema.
 *
 * @example
 * ```ts
 * import { validateTransaction } from '@liskhq/lisk-transactions';
 * const validation = validateTransaction(transaction, paramsSchema);
 * ```
 *
 * @param transactionObject The transaction to validate.
 * @param paramsSchema The parameters schema for the transaction.
 *
 * @returns `undefined`, if the transaction is valid and no errors are found.
 * Returns the Error, if any errors are discovered curing the validation.
 *
 * @see [LIP 0062 - Use pre-hashing for signatures](https://github.com/LiskHQ/lips/blob/main/proposals/lip-0062.md)
 * @see {@link LiskValidator}
 */
export const validateTransaction = (
	transactionObject: Record<string, unknown>,
	paramsSchema?: object,
): LiskValidationError | Error | undefined => {
	const transactionObjectWithEmptyParameters = {
		...transactionObject,
		params: Buffer.alloc(0),
	};
	validator.validate(baseTransactionSchema, transactionObjectWithEmptyParameters);

	if (!paramsSchema) {
		return undefined;
	}

	if (typeof transactionObject.params !== 'object' || transactionObject.params === null) {
		return new Error('Transaction object params must be of type object and not null');
	}
	validator.validate(paramsSchema, transactionObject.params);

	return undefined;
};
