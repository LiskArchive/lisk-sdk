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
	GenericObject,
	CompiledSchema,
	CompiledSchemasArray,
} from './types';
import {
	writeSInt32,
	writeSInt64,
	writeUInt32,
	writeUInt64,
	readUInt32,
	readSInt32,
	readSInt64,
	readUInt64,
} from './varint';
import { writeString, readString } from './string';
import { writeBytes, readBytes } from './bytes';
import { writeBoolean, readBoolean } from './boolean';
import { readKey } from './keys';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _readers : { readonly [key: string]: (value: Buffer, offset: number) => any } = {
	uint32: readUInt32,
	sint32: readSInt32,
	uint64: readUInt64,
	sint64: readSInt64,
	string: readString,
	bytes: readBytes,
	boolean: readBoolean,
};

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
	return [chunks, simpleObjectSize]
}


export const readObject = (message: Buffer, offset: number, compiledSchema: CompiledSchemasArray): [GenericObject, number] => {
	let index = offset;
	const result: GenericObject = {};
	for (let i = 0; i < compiledSchema.length; i += 1) {
		const typeSchema = compiledSchema[i];
		if (Array.isArray(typeSchema)) {
			// Takeout the root wireType and field number
			if (typeSchema[0].schemaProp.type === 'array') {
				const [arr, nextOffset] = readArray(message, index, typeSchema);
				result[typeSchema[0].propertyName] = arr;
				index = nextOffset;
			} else if (typeSchema[0].schemaProp.type === 'object') {
				// It should be wire type 2 as it's object
				const [, keySize] = readUInt32(message, index);
				index += keySize;
				// Takeout the length
				const [, objectSize] = readUInt32(message, index);
				index += objectSize;
				const [obj, nextOffset] = readObject(message, index, typeSchema);
				result[typeSchema[0].propertyName] = obj;
				index = nextOffset;
			} else {
				throw new Error('Invalid container type');
			}
			continue;
		}
		if (typeSchema.schemaProp.type === 'object' || typeSchema.schemaProp.type === 'array') {
			// typeSchema is header, and we ignroe this
			continue;
		}
		// Takeout the root wireType and field number
		const [key, keySize] = readUInt32(message, index);
		const [fieldNumber] = readKey(key);
		if (fieldNumber !== typeSchema.schemaProp.fieldNumber) {
			continue;
		}
		// Index is only incremented when the key is actually used
		index += keySize;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const [scalarValue, scalarSize] = _readers[typeSchema.schemaProp.dataType as string](message, index);
		index += scalarSize;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		result[typeSchema.propertyName] = scalarValue;
	}
	return [result, index];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const readArray = (message: Buffer, offset: number, compiledSchema: CompiledSchemasArray): [Array<any>, number] => {
	// Takeout the root wireType and field number
	let index = offset;
	if (index >= message.length) {
		return [[], index];
	}
	const startingByte = message[index];
	// It should be wire type 2 as it's object
	const [, keySize] = readUInt32(message, index);
	index += keySize;
	// Takeout the length
	const [arrayLength, wireType2Size] = readUInt32(message, index);
	index += wireType2Size;
	const [, typeSchema] = compiledSchema;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const result: Array<any> = [];
	// Case of object
	if (Array.isArray(typeSchema)) {
		// handle as object
		const [nestedTypeSchema] = typeSchema;
		if (nestedTypeSchema.schemaProp.type === 'object') {
			// Since first key and length is read, we do read them directly
			if (wireType2Size !== 0) {
				// readObject returns Next offset, not index used
				const [res, nextOffset] = readObject(message, index, typeSchema);
				result.push(res);
				index = nextOffset;
			} else {
				result.push({});
			}
			// If still the next bytes is the same key, it is still element of array
			while (message[index] === startingByte) {
				const [, wire2KeySize] = readUInt32(message, index);
				index += wire2KeySize;
				// Takeout the length
				const [wireType2Length, wireType2LengthSize] = readUInt32(message, index);
				index += wireType2LengthSize;
				if (wireType2Length === 0) {
					result.push({});
					// Add default value
					continue;
				}
				// readObject returns Next offset, not index used
				const [res, nextOffset] = readObject(message, index, typeSchema);
				result.push(res);
				index += nextOffset;
			}
			return [result, index];
		}
		throw new Error('Invalid container type');
	}
	// Case for string and bytes
	if (typeSchema.schemaProp.dataType === 'string' || typeSchema.schemaProp.dataType === 'bytes') {
		// Since first key and length is read, we do read them directly
		if (wireType2Size !== 0) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const [res, size] = _readers[typeSchema.schemaProp.dataType as string](message, index);
			result.push(res);
			index += size;
		} else if (typeSchema.schemaProp.dataType === 'string') {
			result.push('');
		} else {
			result.push(Buffer.alloc(0));
		}
		// If still the next bytes is the same key, it is still element of array
		while (message[index] === startingByte) {
			const [, wire2KeySize] = readUInt32(message, offset);
			index += wire2KeySize;
			// Takeout the length
			const [wireType2Length, wireType2LengthSize] = readUInt32(message, index);
			index += wireType2LengthSize;
			if (wireType2Length === 0) {
				if (typeSchema.schemaProp.dataType === 'string') {
					result.push('');
				} else {
					result.push(Buffer.alloc(0));
				}
				// Add default value
				continue;
			}
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const [res, wire2Size] = _readers[typeSchema.schemaProp.dataType as string](message, index);
			result.push(res);
			index += wire2Size;
		}
		return [result, index];
	}
	// Case for varint and boolean
	const end = index + arrayLength;
	while (index < end) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const [res, size] = _readers[typeSchema.schemaProp.dataType as string](message, index);
			result.push(res);
			index += size;
	}

	return [result, index];
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
