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
import { ValidateFunction } from 'ajv';
import * as formats from './formats';
import { ErrorObject, LiskValidationError } from './errors';
import { fieldNumberKeyword } from './keywords/field_number';
import { dataTypeKeyword } from './keywords/data_type';
import { liskMetaSchema } from './lisk_meta_schema';

export const liskSchemaIdentifier: string = liskMetaSchema.$id;

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
				new Set(data.filter(datum => typeof datum === 'string').map((key: string) => key.slice(1)))
					.size === data.length,
		});

		this._validator.addMetaSchema(liskMetaSchema);
		this._validator.addKeyword('fieldNumber', fieldNumberKeyword);
		this._validator.addKeyword('dataType', dataTypeKeyword);
	}

	public validate(schema: object, data: object): ReadonlyArray<ErrorObject> {
		if (!this._validator.validate(schema, data)) {
			return (this._validator.errors as unknown) as ReadonlyArray<ErrorObject>;
		}

		return [];
	}

	public validateSchema(schema: object | boolean): ReadonlyArray<ErrorObject> {
		if (!this._validator.validateSchema(schema)) {
			return (this._validator.errors as unknown) as ReadonlyArray<ErrorObject>;
		}

		return [];
	}

	public compile(schema: object | boolean): ValidateFunction {
		try {
			return this._validator.compile(schema);
		} catch (error) {
			if (error instanceof LiskValidationError) {
				throw error;
			}

			throw new LiskValidationError([
				{
					message: (error as Error).message.toString(),
					dataPath: '',
					keyword: '',
					schemaPath: '',
					params: {},
				},
			]);
		}
	}

	public removeSchema(schemaKeyRef?: object | string | RegExp | boolean): Ajv.Ajv {
		return this._validator.removeSchema(schemaKeyRef);
	}
}

export const validator = new LiskValidator();
