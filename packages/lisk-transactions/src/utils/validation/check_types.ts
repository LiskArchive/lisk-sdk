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
 *
 */
import { TransactionError } from '../../errors';
import { IsValidResponse, TransactionJSON } from '../../transaction_types';
import { validator } from './';
import * as schemas from './schema';

export const checkTypes = (tx: TransactionJSON): IsValidResponse => {
	const typeValidator = validator.compile(schemas.transaction);
	const valid = typeValidator(tx) as boolean;

	const errors = typeValidator.errors
		? typeValidator.errors.map(
				error =>
					new TransactionError(
						`'${error.dataPath}' ${error.message}`,
						tx.id,
						error.dataPath,
					),
		  )
		: [];

	return { valid, errors };
};

export const isTypedArray = <T>(
	arg: ReadonlyArray<unknown>,
	checker: (input: unknown) => boolean,
): arg is ReadonlyArray<T> => arg.every(checker);

export const isTypedObjectArrayWithKeys = <T>(
	arg: ReadonlyArray<unknown>,
	requiredKeys: ReadonlyArray<string>,
): arg is ReadonlyArray<T> =>
	isTypedArray(arg, (input: unknown) => {
		if (typeof input !== 'object' || input === null) {
			return false;
		}

		return requiredKeys.every(key => Object.keys(input).includes(key));
	});
