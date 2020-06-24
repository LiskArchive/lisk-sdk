/* eslint-disable */

import { codec } from './codec';
import { GenericObject, Schema, SchemaPair, SchemaProps } from './types';

const _liskMessageValueToJSONValue: {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	readonly [key: string]: (value: any) => any;
} = {
	uint32: value => value as number,
	sint32: value => value as number,
	uint64: value => (value as BigInt).toString(),
	sint64: value => (value as BigInt).toString(),
	string: value => value as string,
	bytes: value => (value as Buffer).toString('base64'),
	boolean: value => value as boolean,
};

const findObjectByPath = (
	message: SchemaPair,
	pathArr: string[],
): SchemaProps | undefined => {
	let result = message;
	for (let i = 0; i < pathArr.length; i += 1) {
		if (result[pathArr[i]] === undefined) {
			return undefined;
		}
		if (result[pathArr[i]].properties !== undefined) {
			result = result[pathArr[i]].properties;
		} else {
			result = result[pathArr[i]];
		}
	}
	return result;
};

const isObject = (item: unknown): boolean =>
	typeof item === 'object' &&
	item !== null &&
	!Array.isArray(item) &&
	!Buffer.isBuffer(item);

const iterator = function (this: any) {
	let index = 0;
	const properties = Object.keys(this);
	let Done = false;
	return {
		next: () => {
			Done = index >= properties.length;
			const obj = {
				done: Done,
				value: { value: this[properties[index]], key: properties[index] },
			};
			index += 1;
			return obj;
		},
	};
};

const recursiveTypeCast = (
	object: GenericObject,
	schema: Schema,
	dataPath: string[],
) => {
	for (let { key, value } of object) {
		if (isObject(value)) {
			dataPath.push(key);
			value[Symbol.iterator] = iterator;
			recursiveTypeCast(value, schema, dataPath);
			dataPath.pop();
			delete object[(Symbol.iterator as unknown) as string];
		} else if (Array.isArray(value)) {
			dataPath.push(key);
			const schemaProp = findObjectByPath(
				schema.properties as SchemaPair,
				dataPath,
			);
			if (
				schemaProp.items.type !== undefined &&
				schemaProp.items.type === 'object'
			) {
				for (let i = 0; i < value.length; i += 1) {
					dataPath.push('items');
					const arrayObject = value[i];
					arrayObject[Symbol.iterator] = iterator;
					recursiveTypeCast(arrayObject, schema, dataPath);
					dataPath.pop();
					delete arrayObject[Symbol.iterator];
				}
			} else {
				for (let i = 0; i < value.length; i += 1) {
					object[key][i] = _liskMessageValueToJSONValue[
						schemaProp.items.dataType
					](value[i]);
				}
			}
			dataPath.pop();
		} else {
			dataPath.push(key);
			const schemaProp = findObjectByPath(schema.properties, dataPath);
			object[key] = _liskMessageValueToJSONValue[schemaProp.dataType](value);
			dataPath.pop();
			delete object[(Symbol.iterator as unknown) as string];
		}
	}
};

const decodeJSON = (schema: Schema, message: Buffer): GenericObject => {
	const decodedMessage: GenericObject = codec.decode(schema, message);

	recursiveTypeCast(decodedMessage, schema, []);
	return decodedMessage as GenericObject;
};

module.exports = {
	decodeJSON,
};
