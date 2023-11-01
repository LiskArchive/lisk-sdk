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

import { validator } from '@liskhq/lisk-validator';
import { emptySchema } from '@liskhq/lisk-codec';
import { baseTransactionSchema } from './schema';

/**
 * Validates a given transaction against its' schema.
 *
 * @example
 * ```ts
 * import { validateTransaction } from '@liskhq/lisk-transactions';
 * const validation = validateTransaction(transaction, paramsSchema);
 * ```
 *
 * @param transaction The transaction to validate.
 * @param paramsSchema The parameters schema for the transaction.
 *
 * @returns `undefined`, if the transaction is valid and no errors are found.
 * Returns the Error, if any errors are discovered curing the validation.
 *
 * @see [LIP 0062 - Use pre-hashing for signatures](https://github.com/LiskHQ/lips/blob/main/proposals/lip-0062.md)
 * @see {@link @liskhq/lisk-validator!LiskValidator.validate}
 */

export const validateTransaction = (
	transaction: Record<string, unknown>,
	paramsSchema: object = emptySchema,
) => {
	const transactionWithEmptyParams = {
		...transaction,
		params: Buffer.alloc(0),
	};
	validator.validate(baseTransactionSchema, transactionWithEmptyParams);

	if (typeof transaction.params !== 'object' || transaction.params === null) {
		throw new Error('Transaction object params must be of type object and not null');
	}
	validator.validate(paramsSchema, transaction.params);
};
