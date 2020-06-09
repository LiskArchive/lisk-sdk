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
 */

import { ErrorParameters } from 'ajv';

// Ajv.ErrorObject makes `schemaPath` and `dataPath` required
// While these are not if we want to infer default values from validation
export interface ErrorObject {
	keyword: string;
	dataPath?: string;
	schemaPath?: string;
	params: ErrorParameters;
	// Added to validation errors of propertyNames keyword schema
	propertyName?: string;
	// Excluded if messages set to false.
	message?: string;
	// These are added with the `verbose` option.
	schema?: never;
	parentSchema?: object;
	data?: never;
}

export class LiskValidationError extends Error {
	public readonly errors: ErrorObject[];

	public constructor(errors: ErrorObject[]) {
		super(`Lisk validator found ${errors.length} error[s]`);
		this.errors = errors;
	}
}
