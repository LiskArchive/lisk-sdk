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

import { findObjectByPath, generateKey } from './utils';
import {
	CompiledSchema,
	CompiledSchemas,
	GenericObject,
	Schema,
	SchemaPair,
} from './types';

import { writeVarInt, writeSignedVarInt } from './varint';
import { writeString } from './string';
import { writeBytes } from './bytes';
import { writeBoolean } from './boolean';


export class Codec {
	private readonly _compileSchemas: CompiledSchemas = {};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private readonly _writers : { readonly [key: string]: (value: any, _schema: any) => Buffer } = {
		uint32: writeVarInt,
		sint32: writeSignedVarInt,
		uint64: writeVarInt,
		sint64: writeSignedVarInt,
		string: writeString,
		bytes: writeBytes,
		boolean: writeBoolean,
	};

	public addSchema(schema: Schema): void {
		const schemaName = schema.$id;
		this._compileSchemas[schemaName] = this.compileSchema(
			schema.properties,
			[],
			[],
		);
	}

	public encode(schema: Schema, message: GenericObject): Buffer {
		if (this._compileSchemas[schema.$id] === undefined) {
			this.addSchema(schema);
		}

		const compiledSchema = this._compileSchemas[schema.$id];

		const chunks = [];
		// eslint-disable-next-line @typescript-eslint/prefer-for-of
		for (let i = 0; i < compiledSchema.length; i += 1) {
			const { binaryKey, dataPath, schemaProp, propertyName } = compiledSchema[i];
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const pathToValue = findObjectByPath(message, dataPath);
			if (pathToValue === undefined) {
				throw new Error(
					'Compiled schema contains an invalid path to a property. Some problem occured when caching the schema.',
				);
			}

			const value = pathToValue[propertyName];

			// Missing properties are not encoded as per LIP-0027
			if (value === undefined) {
				// eslint-disable-next-line no-continue
				continue;
			}

			const dataType = schemaProp.dataType ?? schemaProp.type;

			if (dataType === undefined) {
				throw new Error('Schema is corrutped as neither "type" nor "dataType" are defined in it.');
			}

			const binaryValue = this._writers[dataType](value, schemaProp);

			chunks.push(binaryKey);
			chunks.push(binaryValue);
		}

		const binaryMessage = Buffer.concat(chunks);

		return binaryMessage;
	}

	// eslint-disable-next-line
	public decode<T>(_schema: object, _message: Buffer): T {
		return {} as T;
	}

	public encodeNoCache(
		schema: SchemaPair,
		object: GenericObject,
		encodedChunks: Buffer[],
		dataPath: string[],
	): Buffer[] {
		const currentDepthSchema = Object.entries(schema).sort(
			(a, b) => a[1].fieldNumber - b[1].fieldNumber,
		);

		for (const [propertyName, schemaProp] of currentDepthSchema) {
			if (schemaProp.dataType === 'object' || schemaProp.type === 'object') {
				dataPath.push(propertyName);
				if (!schemaProp.properties) {
					throw new Error('Sub schema is missing its properties.');
				}

				this.encodeNoCache(schemaProp.properties, object, encodedChunks, dataPath);
				dataPath.pop();
			} else {
				const valuePath = findObjectByPath(object, dataPath);
				if (valuePath === undefined) {
					throw new Error('something wroong with value path')
				}

				const dataType = schemaProp.dataType ?? schemaProp.type;

				if (dataType === undefined) {
					throw new Error('Schema is corrutped as neither "type" nor "dataType" are defined in it.');
				}

				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const binaryValue = this._writers[dataType](valuePath[propertyName], schemaProp);

				encodedChunks.push(generateKey(schemaProp));
				encodedChunks.push(binaryValue);
			}
		}
		return encodedChunks;
	}

	private compileSchema(
		schema: SchemaPair,
		compiledSchema: CompiledSchema[] | any,
		dataPath: string[],
	): CompiledSchema[] {
		const currentDepthSchema = Object.entries(schema).sort(
			(a, b) => a[1].fieldNumber - b[1].fieldNumber,
		);

		for (const [propertyName, schemaProp] of currentDepthSchema) {
			if (schemaProp.type === 'object' || schemaProp.type === 'array') {
				dataPath.push(propertyName);
				if (!schemaProp.properties && !schemaProp.items) {
					throw new Error('Nested schemas need either a "properties" or "items" property.');
				}
				// Push "hinting header for type"
				const tempSubSchema = [
					{
						schemaProp: { fieldNumber: schemaProp.fieldNumber, type: schemaProp.type },
						propertyName,
						binaryKey: generateKey(schemaProp),
						dataPath: [...dataPath],
					},
				];

				let { properties } = schemaProp;

				// We need this as type=array has a different structure
				if (schemaProp.type === 'array' && schemaProp.items?.type === 'object') {
					properties = schemaProp.items?.properties;
				}



				const res = this.compileSchema(properties as SchemaPair, tempSubSchema, dataPath);
				compiledSchema.push(res);
				dataPath.pop();
			} else {
				compiledSchema.push({
					schemaProp,
					propertyName,
					binaryKey: generateKey(schemaProp),
					dataPath: [...dataPath],
				});
			}
		}
		return compiledSchema;
	}
}

export const codec = new Codec();
