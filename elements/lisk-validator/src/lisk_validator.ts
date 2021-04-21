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

import Ajv, { AnySchema, ValidateFunction } from 'ajv';
import addDefaultFormats from 'ajv-formats';
import * as formats from './formats';
import { convertErrorsToLegacyFormat, LiskValidationError } from './errors';
import { fieldNumberKeyword } from './keywords/field_number';
import { dataTypeKeyword } from './keywords/data_type';
import { liskMetaSchema } from './lisk_meta_schema';
import { LiskErrorObject } from './types';

export const liskSchemaIdentifier: string = liskMetaSchema.$id;

class LiskValidator {
	private readonly _validator: Ajv;

	public constructor() {
		this._validator = new Ajv({
			strict: true,
			strictSchema: true,
			allErrors: true,
			useDefaults: false,
			// FIXME: Combination with lisk-codec schema, making true would throw error because
			// Trace: Error: schema with key or id "/block/header"
			addUsedSchema: false,

			// To avoid warnings for not defining `type` for each property
			strictTypes: false,
		});

		addDefaultFormats(this._validator);

		for (const formatName of Object.keys(formats)) {
			this._validator.addFormat(
				formatName,
				// eslint-disable-next-line import/namespace
				formats[formatName as keyof typeof formats],
			);
		}

		this._validator.addKeyword({
			keyword: 'uniqueSignedPublicKeys',
			type: 'array',
			// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
			compile: () => (data: ReadonlyArray<string>) =>
				new Set(data.filter(datum => typeof datum === 'string').map((key: string) => key.slice(1)))
					.size === data.length,
		});

		// TODO: addMetaSchema is not validating custom formats
		// on meta schema so why we have to use `compile`.
		this._validator.compile(liskMetaSchema);

		this._validator.addMetaSchema(liskMetaSchema);
		this._validator.addKeyword(fieldNumberKeyword);
		this._validator.addKeyword(dataTypeKeyword);
	}

	public validate(schema: object, data: object): LiskErrorObject[] {
		if (!this._validator.validate(schema, data)) {
			return convertErrorsToLegacyFormat(this._validator.errors as LiskErrorObject[]);
		}

		return [];
	}

	public validateSchema(schema: AnySchema | boolean): ReadonlyArray<LiskErrorObject> {
		if (!this._validator.validateSchema(schema)) {
			return convertErrorsToLegacyFormat(this._validator.errors as LiskErrorObject[]);
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

	public removeSchema(schemaKeyRef?: object | string | RegExp | boolean): Ajv {
		return this._validator.removeSchema(schemaKeyRef);
	}
}

export const validator = new LiskValidator();
