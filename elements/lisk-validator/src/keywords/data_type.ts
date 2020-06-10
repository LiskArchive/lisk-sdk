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

import * as Debug from 'debug';
import { LiskValidationError, ErrorObject } from '../errors';
import {
	isBoolean,
	isBytes,
	isUInt32,
	isSInt32,
	isString,
	isSInt64,
	isUInt64,
} from '../validation';

// eslint-disable-next-line new-cap
const debug = Debug('codec:keyword:dataType');

export const metaSchema = {
	title: 'Lisk Codec Data Type',
	type: 'string',
	enum: ['bytes', 'uint32', 'sint32', 'uint64', 'sint64', 'string', 'boolean'],
};

type ValidateFunction = (
	data: string,
	dataPath?: string,
	parentData?: object,
	parentDataProperty?: string | number,
	rootData?: object,
) => boolean;

interface AjvContext {
	root: {
		schema: object;
	};
	schemaPath: string;
}

interface KVPair {
	[key: string]: unknown;
}
interface ValidateFunctionContext {
	errors?: ErrorObject[];
	(
		data: Buffer | bigint | string | number,
		dataPath?: string,
		parentData?: object,
		parentDataProperty?: string | number,
		rootData?: object,
	): boolean;
}

const compile = (
	value: string,
	parentSchema: object,
	it: Partial<AjvContext>,
): ValidateFunction => {
	debug('compile: value: %s', value);
	debug('compile: parent schema: %j', parentSchema);
	const typePropertyPresent = Object.keys(parentSchema).includes('type');

	if (typePropertyPresent) {
		throw new LiskValidationError([
			{
				keyword: 'dataType',
				message: 'Either "dataType" or "type" can be presented in schema',
				params: { dataType: value },
				dataPath: '',
				schemaPath: it.schemaPath ?? '',
			},
		]);
	}

	const validate: ValidateFunctionContext = (
		data: Buffer | bigint | string | number,
		_dataPath?: string,
		_parentData?: object,
		_parentDataProperty?: string | number,
		_rootData?: object,
	): boolean => {
		if (value === 'boolean') {
			return isBoolean(data);
		}
		if (value === 'bytes') {
			if (!isBytes(data as Buffer)) {
				return false;
			}
			const parent = parentSchema as KVPair;
			if (typeof parent.minLength === 'number') {
				const { length } = data as Buffer;
				if (length < parent.minLength) {
					validate.errors = [
						{
							keyword: 'dataType',
							message: 'minLength does not satisfied',
							params: { dataType: value, minLength: parent.minLength, length },
						},
					];
					return false;
				}
			}
			if (typeof parent.maxLength === 'number') {
				const { length } = data as Buffer;
				if (length > parent.maxLength) {
					validate.errors = [
						{
							keyword: 'dataType',
							message: 'maxLength does not satisfied',
							params: { dataType: value, maxLength: parent.maxLength, length },
						},
					];
					return false;
				}
			}
		}
		if (value === 'string') {
			return isString(data);
		}
		if (value === 'uint32') {
			return isUInt32(data);
		}
		if (value === 'uint64') {
			return isUInt64(data);
		}
		if (value === 'sint32') {
			return isSInt32(data);
		}
		if (value === 'sint64') {
			return isSInt64(data);
		}

		// Either "dataType" or "type" can be presented in schema
		return true;
	};

	return validate;
};

export const dataTypeKeyword = {
	compile,
	errors: 'full',
	modifying: false,
	metaSchema,
};
