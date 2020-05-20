/* eslint-disable no-param-reassign */
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
	generateKey,
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

export const writeObject = (compiledSchema: CompiledSchemasArray, message: GenericObject, chunks: Buffer[]) : [Buffer[], number] => {
	let simpleObjectSize = 0;
	// eslint-disable-next-line @typescript-eslint/prefer-for-of
	for (let i = 0; i < compiledSchema.length; i += 1) {
		const property = compiledSchema[i];
		if (Array.isArray(property)) {
			const headerProp = property[0];
			const nestedObject = findObjectByPath(message, [headerProp.propertyName]);
			// Write the key for container object
			const key = generateKey(headerProp.schemaProp);
			chunks.push(key);
			const res = writeObject(property, nestedObject as GenericObject, []);
			// Add nested object size to total size
			simpleObjectSize += res[1] + key.length;
			chunks.push(Buffer.from(simpleObjectSize.toString())); // This is size written from sub-object
			chunks = chunks.concat(...res[0]);
		} else {
			// This is the header object so it does not need to be written
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

			const binaryValue = _writers[dataType](value);

			chunks.push(binaryKey);
			chunks.push(binaryValue);
			simpleObjectSize += binaryKey.length + binaryValue.length;
		}
	}
	return [chunks, simpleObjectSize]
}
