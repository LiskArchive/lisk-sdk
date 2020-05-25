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

import { GenericObject, CompiledSchemasArray, CompiledSchema } from './types';

import { writeSInt32, writeSInt64, writeUInt32, writeUInt64 } from './varint';
import { writeString } from './string';
import { writeBytes } from './bytes';
import { writeBoolean } from './boolean';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _writers: { readonly [key: string]: (value: any) => Buffer } = {
	uint32: writeUInt32,
	sint32: writeSInt32,
	uint64: writeUInt64,
	sint64: writeSInt64,
	string: writeString,
	bytes: writeBytes,
	boolean: writeBoolean,
};

export const writeObject = (
	compiledSchema: CompiledSchemasArray,
	message: GenericObject,
	chunks: Buffer[],
): [Buffer[], number] => {
	let simpleObjectSize = 0;
	// eslint-disable-next-line @typescript-eslint/prefer-for-of
	for (let i = 0; i < compiledSchema.length; i += 1) {
		const property = compiledSchema[i];
		if (Array.isArray(property)) {
			const headerProp = property[0];
			if (headerProp.schemaProp.type === 'array') {
				// eslint-disable-next-line @typescript-eslint/no-use-before-define
				writeArray(
					property,
					message[headerProp.propertyName] as Array<unknown>,
					chunks,
				);
				// eslint-disable-next-line no-continue
				continue;
			}
			// Write the key for container object
			chunks.push(headerProp.binaryKey);
			const [encodedValues, totalWrittenSize] = writeObject(
				property,
				message[headerProp.propertyName] as GenericObject,
				[],
			);
			// Add nested object size to total size
			chunks.push(_writers.uint32(totalWrittenSize));
			// eslint-disable-next-line @typescript-eslint/prefer-for-of
			for (let e = 0; e < encodedValues.length; e += 1) {
				chunks.push(encodedValues[e]);
			}
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

			const {
				schemaProp: { dataType },
				binaryKey,
			} = property;
			if (dataType === undefined) {
				throw new Error(
					'Compiled Schema is corrupted as "dataType" can not be undefined.',
				);
			}

			const binaryValue = _writers[dataType](value);

			chunks.push(binaryKey);
			chunks.push(binaryValue);
			simpleObjectSize += binaryKey.length + binaryValue.length;
		}
	}
	return [chunks, simpleObjectSize];
};

export const writeArray = (
	compiledSchema: CompiledSchema[],
	message: Array<unknown>,
	chunks: Buffer[],
): [Buffer[], number] => {
	let totalSize = 0;
	const [rootSchema, typeSchema] = compiledSchema;
	// Array of object
	if (Array.isArray(typeSchema)) {
		// eslint-disable-next-line @typescript-eslint/prefer-for-of
		for (let i = 0; i < message.length; i += 1) {
			const [res, objectSize] = writeObject(
				typeSchema,
				message[i] as GenericObject,
				[],
			);
			chunks.push(rootSchema.binaryKey);
			chunks.push(_writers.uint32(objectSize));
			// eslint-disable-next-line @typescript-eslint/prefer-for-of
			for (let j = 0; j < res.length; j += 1) {
				chunks.push(res[j]);
			}
			totalSize += objectSize + rootSchema.binaryKey.length;
		}
		return [chunks, totalSize];
	}
	// Array of string or bytes
	if (
		typeSchema.schemaProp.dataType === 'string' ||
		typeSchema.schemaProp.dataType === 'bytes'
	) {
		// eslint-disable-next-line @typescript-eslint/prefer-for-of
		for (let i = 0; i < message.length; i += 1) {
			const res = _writers[typeSchema.schemaProp.dataType as string](
				message[i],
			);
			chunks.push(rootSchema.binaryKey);
			chunks.push(res);
			totalSize += res.length + rootSchema.binaryKey.length;
		}
		return [chunks, totalSize];
	}
	// Array of number or boolean
	chunks.push(rootSchema.binaryKey);
	// Insert size
	const contents = [];
	let contentSize = 0;
	// eslint-disable-next-line @typescript-eslint/prefer-for-of
	for (let i = 0; i < message.length; i += 1) {
		const res = _writers[typeSchema.schemaProp.dataType as string](message[i]);
		contents.push(res);
		contentSize += res.length;
	}
	chunks.push(_writers.uint32(contentSize));
	// eslint-disable-next-line @typescript-eslint/prefer-for-of
	for (let i = 0; i < contents.length; i += 1) {
		chunks.push(contents[i]);
	}
	totalSize += rootSchema.binaryKey.length + contentSize;
	return [chunks, totalSize];
};
