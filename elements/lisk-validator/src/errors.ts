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
	type?: string;
	additionalProperty?: string;
	allowedValue?: string;
	dataType?: string;
	ref?: string;
	limit?: string;
	maxLength?: number;
	minLength?: number;
	length?: number;
	fieldNumbers?: number[];
}

export class LiskValidationError extends Error {
	public readonly errors: ErrorObject[];
	private readonly keywordDataFormatters: {
		[key: string]: (error: ErrorObject) => string;
	};

	public constructor(errors: ErrorObject[]) {
		super();

		this.keywordDataFormatters = {
			// The casting to string in the last parameter of this fuction is valid as it's always present. It seems this casting is required
			// to keep this structure instead of using type guardings
			type: (error): string =>
				`Property '${error.dataPath ?? ''}' should be of type '${
					error.params.type as string
				}'`,
			additionalProperties: (error): string =>
				`Property '${error.dataPath ?? ''}' has extraneous property '${
					error.params.additionalProperty as string
				}'`,
			minLength: (error): string =>
				`Property '${error.dataPath ?? ''}' ${error.message as string}`,
			maxLength: (error): string =>
				`Property '${error.dataPath ?? ''}' ${error.message as string}`,
			format: (error): string =>
				`Property '${error.dataPath ?? ''}' ${error.message as string}`,
			required: (error): string =>
				`Missing property, ${error.message as string}`,
			const: (error): string =>
				`Property '${error.dataPath ?? ''}' should be '${
					error.params.allowedValue as string
				}'`,
			dataType: (error): string =>
				`Property '${error.dataPath ?? ''}' ${error.message as string}`,
		};

		this.errors = errors;
		this.message = `Lisk validator found ${
			this.errors.length
		} error[s]:\n ${this.compileErrors().join('\n ')}`;
	}

	private compileErrors(): string[] {
		const errorMsgs = this.errors.map(anError =>
			this.keywordDataFormatters[anError.keyword](anError),
		);
		return errorMsgs;
	}
}
