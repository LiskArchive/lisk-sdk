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
import {
	findObjectByPath,
} from './utils';

import {
	GenericObject,
	CompiledSchemasArray,
} from './types';

import { writeSInt32, writeSInt64, writeUInt32, writeUInt64 } from './varint';
import { writeString } from './string';
import { writeBytes } from './bytes';
import { writeBoolean } from './boolean';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _writers : { readonly [key: string]: (value: any) => Buffer } = {
	uint32: writeUInt32,
	sint32: writeSInt32,
	uint64: writeUInt64,
	sint64: writeSInt64,
	string: writeString,
	bytes: writeBytes,
	boolean: writeBoolean,
};

export const writeObject = (compiledSchema: CompiledSchemasArray, message: GenericObject, state: { chunks: Buffer[], writenSize: number }) : void => {
	// eslint-disable-next-line @typescript-eslint/prefer-for-of
	for (let i = 0; i < compiledSchema.length; i += 1) {
		const property = compiledSchema[i];
		if (Array.isArray(property)) {
			// eslint-disable-next-line no-console
			const headerProp = property[0];
			// console.log('RECURSIVE CASE.........................................................................');
			// console.log(headerProp);
			// console.log(property);
			// console.log('^'.repeat(120));
			const nestedObject = findObjectByPath(message, [headerProp.propertyName]);
			// console.log('nestedObject', nestedObject);

			// push key here
			// writeObject(property, nestedObject as GenericObject, state);
			writeObject(property, nestedObject as GenericObject, state);

			// push result.size
			// push result
		} else {
			if (property.schemaProp.type === 'object') {
				// eslint-disable-next-line no-continue
				continue;
			}
			const value = message[property.propertyName];
			// Missing properties are not encoded as per LIP-0027
			if (value === undefined) {
				// eslint-disable-next-line no-continue
				continue;
			}

			const { schemaProp: { dataType }, binaryKey } = property;
			if (dataType === undefined) {
				throw new Error('Compiled Schema is corrutped as "dataType" can not be undefined.');
			}

			// Values are endode as either [key][value] or [key][size][value]
			const binaryValue = _writers[dataType](value);

			state.chunks.push(binaryKey);

			let bytesOrStringSize: Buffer;
			let bytesOrStringSizeLenght = 0;
			if (dataType === 'bytes' || dataType === 'string') { // MAYBE USE WIRE TYPE FOR THIS LIKE 2
				bytesOrStringSize = _writers.sint32(binaryValue.length);
				bytesOrStringSizeLenght = bytesOrStringSize.length;
				state.chunks.push(bytesOrStringSize);
			}

			state.chunks.push(binaryValue);
			// eslint-disable-next-line no-param-reassign
			state.writenSize += binaryKey.length + bytesOrStringSizeLenght + binaryValue.length;
			console.log('partialSize:', state.writenSize);
		}
	}
	console.log(state.chunks);
}
