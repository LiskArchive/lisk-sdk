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

import { LiskErrorObject } from './types';

// Ajv.ErrorObject makes `schemaPath` and `dataPath` required
// While these are not if we want to infer default values from validation

const errorParamToString = (param: string | Buffer | bigint | undefined | unknown): string => {
	let paramAsString = '';
	if (typeof param === 'bigint') {
		paramAsString = param.toString();
	} else if (Buffer.isBuffer(param)) {
		paramAsString = param.toString('hex');
	} else if (param === undefined) {
		paramAsString = '';
	} else {
		paramAsString = param as string;
	}
	return paramAsString;
};

type KeywordFormatterFunction = (error: LiskErrorObject) => string;

interface KeywordDataFormatters {
	[key: string]: KeywordFormatterFunction | undefined;
}

export const convertErrorsToLegacyFormat = (errors: LiskErrorObject[]): LiskErrorObject[] =>
	errors.map(e => {
		// In newer version of Ajv dataPath is renamed to instancePath
		// to keep the backward compatibility we have to override here
		const err = e as LiskErrorObject & { instancePath?: string };

		err.dataPath = err.dataPath ?? instancePathToLegacyDataPath(err.instancePath ?? '');
		delete err.instancePath;

		return err;
	});

const instancePathToLegacyDataPath = (path: string) => path.split('/').join('.');

const errorFormatterMap: KeywordDataFormatters = {
	type: error =>
		`Property '${error.dataPath ?? ''}' should be of type '${errorParamToString(
			error.params.type,
		)}'`,
	additionalProperties: error =>
		`Property '${error.dataPath ?? ''}' has extraneous property '${errorParamToString(
			error.params.additionalProperty,
		)}'`,
	minLength: error => `Property '${error.dataPath ?? ''}' ${errorParamToString(error.message)}`,
	maxLength: error => `Property '${error.dataPath ?? ''}' ${errorParamToString(error.message)}`,
	format: error => `Property '${error.dataPath ?? ''}' ${errorParamToString(error.message)}`,
	required: error => `Missing property, ${errorParamToString(error.message)}`,
	dataType: error => `Property '${error.dataPath ?? ''}' ${errorParamToString(error.message)}`,
};

const defaultErrorFormatter: KeywordFormatterFunction = error =>
	error.message ?? 'Unspecified validator error';

const errorFormatter = (error: LiskErrorObject): string =>
	(errorFormatterMap[error.keyword] ?? defaultErrorFormatter)(error);

export class LiskValidationError extends Error {
	public readonly errors: LiskErrorObject[];

	public constructor(errors: LiskErrorObject[]) {
		super();
		this.errors = convertErrorsToLegacyFormat(errors);

		this.message = `Lisk validator found ${
			this.errors.length
		} error[s]:\n${this._compileErrors().join('\n')}`;
	}

	private _compileErrors(): string[] {
		return this.errors.map(errorFormatter);
	}
}
