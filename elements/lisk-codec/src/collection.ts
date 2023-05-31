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
import { GenericObject, CompiledSchema, CompiledSchemasArray } from './types';
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
import { getWireType } from './utils';

const _readers: {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	readonly [key: string]: (value: Buffer, offset: number) => any;
} = {
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
	for (let i = 0; i < compiledSchema.length; i += 1) {
		const property = compiledSchema[i];
		if (Array.isArray(property)) {
			const headerProp = property[0];
			if (headerProp.schemaProp.type === 'array') {
				// eslint-disable-next-line no-use-before-define
				const [, size] = writeArray(
					property,
					message[headerProp.propertyName] as Array<unknown>,
					chunks,
				);
				simpleObjectSize += size;
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
			const objectSize = _writers.uint32(totalWrittenSize);
			simpleObjectSize += objectSize.length + headerProp.binaryKey.length;
			chunks.push(objectSize);
			for (let e = 0; e < encodedValues.length; e += 1) {
				simpleObjectSize += encodedValues[e].length;
				chunks.push(encodedValues[e]);
			}
		} else {
			// This is the header object so it does not need to be written
			if (property.schemaProp.type === 'object') {
				continue;
			}
			const value = message[property.propertyName];
			// Missing properties are not encoded as per LIP-0027
			if (value === undefined) {
				continue;
			}

			const {
				schemaProp: { dataType },
				binaryKey,
			} = property;
			if (dataType === undefined) {
				throw new Error('Compiled Schema is corrupted as "dataType" can not be undefined.');
			}

			const binaryValue = _writers[dataType](value);

			chunks.push(binaryKey);
			chunks.push(binaryValue);
			simpleObjectSize += binaryKey.length + binaryValue.length;
		}
	}
	return [chunks, simpleObjectSize];
};

export const readObject = (
	message: Buffer,
	offset: number,
	compiledSchema: CompiledSchemasArray,
	terminateIndex: number,
): [GenericObject, number] => {
	let index = offset;
	const result: GenericObject = {};
	for (let i = 0; i < compiledSchema.length; i += 1) {
		const typeSchema = compiledSchema[i];
		if (Array.isArray(typeSchema)) {
			// Takeout the root wireType and field number
			if (typeSchema[0].schemaProp.type === 'array') {
				if (index >= terminateIndex) {
					result[typeSchema[0].propertyName] = [];
					continue;
				}
				// eslint-disable-next-line no-use-before-define
				const [arr, nextOffset] = readArray(message, index, typeSchema, terminateIndex);
				result[typeSchema[0].propertyName] = arr;
				index = nextOffset;
			} else if (typeSchema[0].schemaProp.type === 'object') {
				const [key, keySize] = readUInt32(message, index);
				const [fieldNumber, wireType] = readKey(key);
				// case where field number reading is not as expected from schema
				if (fieldNumber !== typeSchema[0].schemaProp.fieldNumber) {
					throw new Error('Invalid field number while decoding.');
				}
				if (getWireType(typeSchema[0].schemaProp) !== wireType) {
					throw new Error('Invalid wiretype while decoding.');
				}

				index += keySize;
				// Takeout the length
				const [objectSize, objectSizeLength] = readUInt32(message, index);
				index += objectSizeLength;
				const [obj, nextOffset] = readObject(message, index, typeSchema, objectSize + index);
				result[typeSchema[0].propertyName] = obj;
				index = nextOffset;
			} else {
				throw new Error('Invalid container type.');
			}
			continue;
		}
		if (typeSchema.schemaProp.type === 'object' || typeSchema.schemaProp.type === 'array') {
			// typeSchema is header, and we ignore this
			continue;
		}
		// case where message length is shorter than what the schema expects
		if (message.length <= index) {
			throw new Error(
				`Message does not contain a property for fieldNumber: ${typeSchema.schemaProp.fieldNumber}.`,
			);
		}
		// Takeout the root wireType and field number
		const [key, keySize] = readUInt32(message, index);
		const [fieldNumber, wireType] = readKey(key);
		if (fieldNumber !== typeSchema.schemaProp.fieldNumber) {
			throw new Error('Invalid field number while decoding.');
		}
		if (getWireType(typeSchema.schemaProp) !== wireType) {
			throw new Error('Invalid wiretype while decoding.');
		}
		// Index is only incremented when the key is actually used
		index += keySize;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const [scalarValue, scalarSize] = _readers[typeSchema.schemaProp.dataType as string](
			message,
			index,
		);
		index += scalarSize;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		result[typeSchema.propertyName] = scalarValue;
	}

	// case where message length is longer than what the schema expects
	if (index !== terminateIndex) {
		throw new Error(
			`Invalid terminate index. Index is ${index} but terminateIndex is ${terminateIndex}`,
		);
	}

	return [result, index];
};

export const readArray = (
	message: Buffer,
	offset: number,
	compiledSchema: CompiledSchemasArray,
	terminateIndex: number,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): [Array<any>, number] => {
	// Takeout the root wireType and field number
	let index = offset;
	if (index >= message.length) {
		return [[], index];
	}
	const startingByte = message[index];
	const [rootSchema, typeSchema] = compiledSchema;
	// Peek the current key, and if not the same fieldnumber, skip
	const [key] = readUInt32(message, index);
	const [fieldNumber] = readKey(key);
	if (fieldNumber !== (rootSchema as CompiledSchema).schemaProp.fieldNumber) {
		return [[], index];
	}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const result: Array<any> = [];
	// Case of object
	if (Array.isArray(typeSchema)) {
		// handle as object
		const [nestedTypeSchema] = typeSchema;
		if (nestedTypeSchema.schemaProp.type === 'object') {
			// If still the next bytes is the same key, it is still element of array
			// Also, in case of object, inside of array, it checks the size of the object
			while (message[index] === startingByte && index !== terminateIndex) {
				const [, wire2KeySize] = readUInt32(message, index);
				index += wire2KeySize;
				// Takeout the length
				const [objectSize, objectSizeLength] = readUInt32(message, index);
				// for object, length is not used
				index += objectSizeLength;
				if (objectSize === 0) {
					continue;
				}
				// If array of object, it also gives the terminating index of the particular object
				const terminatingObjectSize = index + objectSize;
				// readObject returns Next offset, not index used
				const [res, nextOffset] = readObject(message, index, typeSchema, terminatingObjectSize);
				result.push(res);
				index = nextOffset;
			}

			return [result, index];
		}
		throw new Error('Invalid container type');
	}
	// Case for string and bytes
	if (typeSchema.schemaProp.dataType === 'string' || typeSchema.schemaProp.dataType === 'bytes') {
		// If still the next bytes is the same key, it is still element of array
		// Also, in case of object inside of array, it checks the size of the object
		while (message[index] === startingByte && index !== terminateIndex) {
			const [, wire2KeySize] = readUInt32(message, index);
			index += wire2KeySize;
			// wireType2LengthSize is used while decoding string or bytes, therefore it's not subtracted unless it's zero
			const [wireType2Length, wireType2LengthSize] = readUInt32(message, index);
			if (wireType2Length === 0) {
				if (typeSchema.schemaProp.dataType === 'string') {
					result.push('');
				} else {
					result.push(Buffer.alloc(0));
				}
				index += wireType2LengthSize;
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
	const [, keySize] = readUInt32(message, index);
	index += keySize;
	// Takeout the length
	const [arrayLength, wireType2Size] = readUInt32(message, index);
	index += wireType2Size;
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
	if (message.length === 0) {
		return [chunks, 0];
	}
	let totalSize = 0;
	const [rootSchema, typeSchema] = compiledSchema;
	// Array of object
	if (Array.isArray(typeSchema)) {
		for (let i = 0; i < message.length; i += 1) {
			const [res, objectSize] = writeObject(typeSchema, message[i] as GenericObject, []);
			chunks.push(rootSchema.binaryKey);
			const size = _writers.uint32(objectSize);
			chunks.push(size);
			for (let j = 0; j < res.length; j += 1) {
				chunks.push(res[j]);
			}
			totalSize += objectSize + size.length + rootSchema.binaryKey.length;
		}
		return [chunks, totalSize];
	}
	// Array of string or bytes
	if (typeSchema.schemaProp.dataType === 'string' || typeSchema.schemaProp.dataType === 'bytes') {
		for (let i = 0; i < message.length; i += 1) {
			const res = _writers[typeSchema.schemaProp.dataType as string](message[i]);
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
	for (let i = 0; i < message.length; i += 1) {
		const res = _writers[typeSchema.schemaProp.dataType as string](message[i]);
		contents.push(res);
		contentSize += res.length;
	}
	const arrayLength = _writers.uint32(contentSize);
	chunks.push(arrayLength);
	for (let i = 0; i < contents.length; i += 1) {
		chunks.push(contents[i]);
	}
	totalSize += rootSchema.binaryKey.length + contentSize + arrayLength.length;
	return [chunks, totalSize];
};
