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

// Ajv.ErrorObject makes `schemaPath` and `dataPath` required
// While these are not if we want to infer default values from validation

export interface ErrorObject {
	keyword: string;
	dataPath?: string;
	schemaPath?: string;
	params: ErrorParams;
	// Added to validation errors of propertyNames keyword schema
	propertyName?: string;
	// Excluded if messages set to false.
	message?: string;
	// These are added with the `verbose` option.
	schema?: never;
	parentSchema?: object;
	data?: never;
}

interface ErrorParams {
	[key: string]: unknown;
}

const errorParamToString = (
	param: string | Buffer | BigInt | undefined | unknown,
): string => {
	let paramAsString = '';
	if (typeof param === 'bigint') {
		paramAsString = param.toString();
	} else if (Buffer.isBuffer(param)) {
		paramAsString = param.toString('base64');
	} else if (param === undefined) {
		paramAsString = '';
	} else {
		paramAsString = param as string;
	}
	return paramAsString;
};

const errorFormatter = (error: ErrorObject): string => {
	let errorMessage = '';
	switch (error.keyword) {
		case 'type':
			errorMessage = `Property '${
				error.dataPath ?? ''
			}' should be of type '${errorParamToString(error.params.type)}'`;
			break;
		case 'additionalProperties':
			errorMessage = `Property '${
				error.dataPath ?? ''
			}' has extraneous property '${errorParamToString(
				error.params.additionalProperty,
			)}'`;
			break;
		case 'minLength':
			errorMessage = `Property '${error.dataPath ?? ''}' ${errorParamToString(
				error.message,
			)}`;
			break;
		case 'maxLength':
			errorMessage = `Property '${error.dataPath ?? ''}' ${errorParamToString(
				error.message,
			)}`;
			break;
		case 'format':
			errorMessage = `Property '${error.dataPath ?? ''}' ${errorParamToString(
				error.message,
			)}`;
			break;
		case 'required':
			errorMessage = `Missing property, ${errorParamToString(error.message)}`;
			break;
		case 'const':
			errorMessage = `Property '${
				error.dataPath ?? ''
			}' should be '${errorParamToString(error.params.allowedValue)}'`;
			break;
		case 'dataType':
			errorMessage = `Property '${error.dataPath ?? ''}' ${errorParamToString(
				error.message,
			)}`;
			break;
		default:
			errorMessage = error.message ?? 'unspecified validator error';
			break;
	}
	return errorMessage;
};

export class LiskValidationError extends Error {
	public readonly errors: ErrorObject[];

	public constructor(errors: ErrorObject[]) {
		super();

		this.errors = errors;
		this.message = `Lisk validator found ${
			this.errors.length
		} error[s]:\n${this._compileErrors().join('\n')}`;
	}

	private _compileErrors(): string[] {
		const errorMsgs = this.errors.map(anError => errorFormatter(anError));
		return errorMsgs;
	}
}
