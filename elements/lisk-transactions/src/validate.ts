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
	paramsSchema: object,
	transactionObject: Record<string, unknown>,
): LiskValidationError | Error | undefined => {
	const transactionObjectWithEmptyParameters = {
		...transactionObject,
		params: Buffer.alloc(0),
	};
	const schemaErrors = validator.validate(
		baseTransactionSchema,
		transactionObjectWithEmptyParameters,
	);
	if (schemaErrors.length) {
		return new LiskValidationError([...schemaErrors]);
	}

	if (typeof transactionObject.params !== 'object' || transactionObject.params === null) {
		return new Error('Transaction object params must be of type object and not null');
	}
	const paramsSchemaErrors = validator.validate(paramsSchema, transactionObject.params);
	if (paramsSchemaErrors.length) {
		return new LiskValidationError([...paramsSchemaErrors]);
	}
	return undefined;
};
