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

import { ErrorObject, validator } from '@liskhq/lisk-validator';
import { liskMetaSchema } from './lisk_meta_schema';
import { SchemaError } from './errors';
import { fieldNumberKeyword } from './keywords/field_number';
import { dataTypeKeyword } from './keywords/data_type';

export const liskSchemaIdentifier = liskMetaSchema.$id;

validator.addMetaSchema(liskMetaSchema);
validator.addKeyword('fieldNumber', fieldNumberKeyword);
validator.addKeyword('dataType', dataTypeKeyword);

export const validateSchema = (schema: {
	// eslint-disable-next-line
	[key: string]: any;
	$schema?: string;
	$id?: string;
}): ReadonlyArray<ErrorObject> => {
	// We don't want to use cache that schema in validator
	// Otherwise any frequent compilation call will fail
	validator.removeSchema(schema.$id);

	const schemaToValidate = {
		...schema,
		$schema: schema.$schema ?? liskSchemaIdentifier,
	};

	try {
		const errors: ReadonlyArray<ErrorObject> = validator.validateSchema(
			schemaToValidate,
		);

		if (errors.length) {
			return errors;
		}

		// To validate keyword schema we have to compile it
		// Ajv `validateSchema` does not validate keyword meta schema
		// https://github.com/ajv-validator/ajv/issues/1221
		validator.compile(schemaToValidate);
	} catch (error) {
		if (error instanceof SchemaError) {
			return [error.error];
		}

		return [
			{
				message: (error as Error).message.toString(),
				dataPath: '',
				keyword: '',
				schemaPath: '',
				params: {},
			},
		];
	}

	return [];
};
