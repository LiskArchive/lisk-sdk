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
import { BaseTransaction } from './base_transaction';

export const validateTransactionSchema = (
	assetSchema: object,
	transactionObject: Record<string, unknown>,
): LiskValidationError | Error | undefined => {
	const transactionObjectWithEmptyAsset = {
		...transactionObject,
		asset: Buffer.alloc(0),
	};
	const schemaErrors = validator.validate(
		BaseTransaction.BASE_SCHEMA,
		transactionObjectWithEmptyAsset,
	);
	if (schemaErrors.length) {
		return new LiskValidationError([...schemaErrors]);
	}

	if (typeof transactionObject.asset !== 'object' || transactionObject.asset === null) {
		return new Error('Transaction object asset must be of type object and not null');
	}
	const assetSchemaErrors = validator.validate(assetSchema, transactionObject.asset);
	if (assetSchemaErrors.length) {
		return new LiskValidationError([...assetSchemaErrors]);
	}
	// eslint-disable-next-line consistent-return, no-useless-return
	return;
};
