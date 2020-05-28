/*
 * Copyright © 2019 Lisk Foundation
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

import * as Ajv from 'ajv';
import { FormatDefinition, FormatValidator, ValidateFunction } from 'ajv';
import * as formats from './formats';

export type ErrorObject = Ajv.ErrorObject;

class LiskValidator {
	private readonly _validator: Ajv.Ajv;
	public constructor() {
		this._validator = new Ajv({
			allErrors: true,
			schemaId: 'auto',
			useDefaults: false,
		});

		for (const formatName of Object.keys(formats)) {
			this._validator.addFormat(
				formatName,
				// eslint-disable-next-line import/namespace
				formats[formatName as keyof typeof formats],
			);
		}

		this._validator.addKeyword('uniqueSignedPublicKeys', {
			type: 'array',
			// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
			compile: () => (data: ReadonlyArray<string>) =>
				new Set(
					data
						.filter(datum => typeof datum === 'string')
						.map((key: string) => key.slice(1)),
				).size === data.length,
		});
	}

	public validate(schema: object, data: object): ReadonlyArray<ErrorObject> {
		if (!this._validator.validate(schema, data)) {
			return this._validator.errors as ReadonlyArray<ErrorObject>;
		}

		return [];
	}

	public validateSchema(schema: object | boolean): ReadonlyArray<ErrorObject> {
		if (!this._validator.validateSchema(schema)) {
			return this._validator.errors as ReadonlyArray<ErrorObject>;
		}

		return [];
	}

	public compile(schema: object | boolean): ValidateFunction {
		return this._validator.compile(schema);
	}

	public addMetaSchema(schema: object, key?: string): Ajv.Ajv {
		return this._validator.addMetaSchema(schema, key);
	}

	public addKeyword(
		keyword: string,
		definition: Ajv.KeywordDefinition,
	): Ajv.Ajv {
		return this._validator.addKeyword(keyword, definition);
	}

	public addFormat(
		name: string,
		format: FormatValidator | FormatDefinition,
	): Ajv.Ajv {
		return this._validator.addFormat(name, format);
	}
}

export const validator = new LiskValidator();
