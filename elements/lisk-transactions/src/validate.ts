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
