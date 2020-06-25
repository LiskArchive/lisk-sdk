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
	BaseTypes,
	GenericObject,
	SchemaPair,
	SchemaProps,
	SchemaScalarItem,
} from './types';

export interface IteratableGenericObject extends GenericObject {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[Symbol.iterator](): Iterator<{ key: string; value: any }>;
}

const _liskMessageValueToJSONValue: {
	readonly [key: string]: (value: BaseTypes) => BaseTypes;
} = {
	uint32: value => value as number,
	sint32: value => value as number,
	uint64: value => (value as BigInt).toString(),
	sint64: value => (value as BigInt).toString(),
	string: value => value as string,
	bytes: value => (value as Buffer).toString('base64'),
	boolean: value => value as boolean,
};

const _JSONValueToliskMessageValue: {
	readonly [key: string]: (value: BaseTypes) => BaseTypes;
} = {
	uint32: value => value as number,
	sint32: value => value as number,
	uint64: value => BigInt(value),
	sint64: value => BigInt(value),
	string: value => value as string,
	bytes: value => Buffer.from(value as string, 'base64'),
	boolean: value => value as boolean,
};

const findObjectByPath = (
	message: SchemaProps,
	pathArr: string[],
): SchemaProps | undefined => {
	let result: SchemaProps = message;
	for (let i = 0; i < pathArr.length; i += 1) {
		if (!result.properties && !result.items) {
			return undefined;
		}
		if (result.properties) {
			result = result.properties[pathArr[i]];
		} else if (result.items) {
			const x = (result.items as SchemaProps).properties as SchemaPair;
			result = x[pathArr[i]];
		}
	}
	return result;
};

const isObject = (item: unknown): boolean =>
	typeof item === 'object' &&
	item !== null &&
	!Array.isArray(item) &&
	!Buffer.isBuffer(item);

export const iterator = function iterator(
	this: IteratableGenericObject,
): {
	next: () => {
		done: boolean;
		value: { value: IteratableGenericObject; key: string };
	};
} {
	let index = 0;
	const properties = Object.keys(this);
	let Done = false;
	return {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		next: (): { done: boolean; value: { value: any; key: string } } => {
			Done = index >= properties.length;
			const obj = {
				done: Done,
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
				value: { value: this[properties[index]], key: properties[index] },
			};
			index += 1;
			return obj;
		},
	};
};

export const recursiveTypeCast = (
	mode: 'toJSON' | 'fromJSON',
	object: IteratableGenericObject,
	schema: SchemaProps,
	dataPath: string[],
): void => {
	for (const { key, value } of object) {
		if (isObject(value)) {
			dataPath.push(key);

			(value as IteratableGenericObject)[Symbol.iterator] = iterator;
			recursiveTypeCast(mode, value, schema, dataPath);
			dataPath.pop();

			delete (value as IteratableGenericObject)[
				(Symbol.iterator as unknown) as string
			];
		} else if (Array.isArray(value)) {
			dataPath.push(key);
			const schemaProp = findObjectByPath(schema, dataPath);
			if (schemaProp?.items?.type === 'object') {
				for (let i = 0; i < value.length; i += 1) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					const arrayObject = value[i];

					(arrayObject as IteratableGenericObject)[Symbol.iterator] = iterator;
					recursiveTypeCast(mode, arrayObject, schema, dataPath);

					delete (arrayObject as IteratableGenericObject)[Symbol.iterator];
				}
			} else {
				for (let i = 0; i < value.length; i += 1) {
					if (schemaProp === undefined || schemaProp.items === undefined) {
						throw new Error(
							`Invalid schema property found. Path: ${dataPath.join(',')}`,
						);
					}
					if (mode === 'toJSON') {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
						(object[key] as any)[i] = _liskMessageValueToJSONValue[
							(schemaProp.items as SchemaScalarItem).dataType
						](value[i]);
					} else {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
						(object[key] as any)[i] = _JSONValueToliskMessageValue[
							(schemaProp.items as SchemaScalarItem).dataType
						](value[i]);
					}
				}
			}
			dataPath.pop();
		} else {
			dataPath.push(key);
			const schemaProp = findObjectByPath(schema, dataPath);

			if (schemaProp === undefined) {
				throw new Error(
					`Invalid schema property found. Path: ${dataPath.join(',')}`,
				);
			}

			if (mode === 'toJSON') {
				object[key] = _liskMessageValueToJSONValue[
					(schemaProp.dataType as unknown) as string
				](value);
			} else {
				object[key] = _JSONValueToliskMessageValue[
					(schemaProp.dataType as unknown) as string
				](value);
			}

			delete object[(Symbol.iterator as unknown) as string];
			dataPath.pop();
		}
	}
	delete object[(Symbol.iterator as unknown) as string];
};
