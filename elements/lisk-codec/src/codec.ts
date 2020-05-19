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

// import { findObjectByPath, generateKey } from './utils';
import {
	CompiledSchemas,
	CompiledSchemasArray,
	GenericObject,
	Schema,
	SchemaProps,
} from './types';

// import { writeVarInt, writeSignedVarInt } from './varint';
// import { writeString } from './string';
// import { writeBytes } from './bytes';
// import { writeBoolean } from './boolean';


export class Codec {
	private readonly _compileSchemas: CompiledSchemas = {};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	// private readonly _writers : { readonly [key: string]: (value: any, _schema: any) => Buffer } = {
	// 	uint32: writeVarInt,
	// 	sint32: writeSignedVarInt,
	// 	uint64: writeVarInt,
	// 	sint64: writeSignedVarInt,
	// 	string: writeString,
	// 	bytes: writeBytes,
	// 	boolean: writeBoolean,
	// };

	public addSchema(schema: Schema): void {
		const schemaName = schema.$id;
		this._compileSchemas[schemaName] = this.compileSchema(
			schema,
			[],
			[],
		);
	}

	public encode(schema: Schema, _message: GenericObject): Buffer {
		if (this._compileSchemas[schema.$id] === undefined) {
			this.addSchema(schema);
		}

		const compiledSchema = this._compileSchemas[schema.$id];

		console.log(
			JSON.stringify(
				compiledSchema,
				null,
				2,
			),
			);

		return Buffer.from('');

		// const chunks = [];
		// // eslint-disable-next-line @typescript-eslint/prefer-for-of
		// for (let i = 0; i < compiledSchema.length; i += 1) {
		// 	const { binaryKey, dataPath, schemaProp, propertyName } = compiledSchema[i];
		// 	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		// 	const pathToValue = findObjectByPath(message, dataPath);
		// 	if (pathToValue === undefined) {
		// 		throw new Error(
		// 			'Compiled schema contains an invalid path to a property. Some problem occured when caching the schema.',
		// 		);
		// 	}

		// 	const value = pathToValue[propertyName];

		// 	// Missing properties are not encoded as per LIP-0027
		// 	if (value === undefined) {
		// 		// eslint-disable-next-line no-continue
		// 		continue;
		// 	}

		// 	const dataType = schemaProp.dataType ?? schemaProp.type;

		// 	if (dataType === undefined) {
		// 		throw new Error('Schema is corrutped as neither "type" nor "dataType" are defined in it.');
		// 	}

		// 	const binaryValue = this._writers[dataType](value, schemaProp);

		// 	chunks.push(binaryKey);
		// 	chunks.push(binaryValue);
		// }

		// const binaryMessage = Buffer.concat(chunks);

		// return binaryMessage;
	}

	// eslint-disable-next-line
	public decode<T>(_schema: object, _message: Buffer): T {
		return {} as T;
	}

	private compileSchema(
		schema: Schema | SchemaProps,
		compiledSchema: CompiledSchemasArray,
		dataPath: string[],
	): CompiledSchemasArray {
		if (schema.type === 'object') {
			const { properties } = schema;
			if (properties === undefined) {
				throw new Error('Invalid schema. Missing "properties" property');
			}
			const currentDepthSchema = Object.entries(properties).sort(
				(a, b) => a[1].fieldNumber - b[1].fieldNumber,
			);

			// eslint-disable-next-line @typescript-eslint/prefer-for-of
			for (let i = 0; i < currentDepthSchema.length; i += 1) {
				const [schemaPropertyName, schemaPropertyValue] = currentDepthSchema[i];
				if (schemaPropertyValue.type === 'object') { // Object recursive case
					dataPath.push(schemaPropertyName);
					const nestedSchema = [
						{
							propertyName: schemaPropertyName,
							schemaProp: { type: schemaPropertyValue.type, fieldNumber: schemaPropertyValue.fieldNumber },
              dataPath: [...dataPath],
              binaryKey: Buffer.from('1'), // FIX ME WITH REAL KEY
						},
					];
					const res = this.compileSchema(schemaPropertyValue, nestedSchema, dataPath);
					compiledSchema.push(res as any);
					dataPath.pop();
				} else if (schemaPropertyValue.type === 'array') { // Array recursive case

					if (schemaPropertyValue.items === undefined) {
						throw new Error('Invalid schema. Missing "items" property for Array schema');
					}
					dataPath.push(schemaPropertyName);
					if (schemaPropertyValue.items.type === 'object') {
						const nestedSchema = [
							{
								propertyName: schemaPropertyName,
								schemaProp: { type: 'object', fieldNumber: schemaPropertyValue.fieldNumber },
								dataPath: [...dataPath],
								binaryKey: Buffer.from('1'), // FIX ME WITH REAL KEY
							},
						]
						const res = this.compileSchema(schemaPropertyValue.items, nestedSchema, dataPath);
						compiledSchema.push([
							{
								propertyName: schemaPropertyName,
								schemaProp: { type: schemaPropertyValue.type, fieldNumber: schemaPropertyValue.fieldNumber },
								dataPath: [...dataPath],
								binaryKey: Buffer.from('1'), // FIX ME WITH REAL KEY
							},
							res as any,
						]);
						dataPath.pop();
					} else {
						compiledSchema.push([
							{
								propertyName: schemaPropertyName,
								schemaProp: { type: schemaPropertyValue.type, fieldNumber: schemaPropertyValue.fieldNumber },
								dataPath: [...dataPath],
								binaryKey: Buffer.from('1'), // FIX ME WITH REAL KEY
							},
							{
								propertyName: schemaPropertyName,
								schemaProp: { dataType: schemaPropertyValue.items.dataType, fieldNumber: schemaPropertyValue.fieldNumber },
								dataPath: [...dataPath],
								binaryKey: Buffer.from('1'), // FIX ME WITH REAL KEY
							},
						]);
						dataPath.pop();
					}
				} else { // Base case
					compiledSchema.push({
						propertyName: schemaPropertyName,
						schemaProp: schemaPropertyValue,
						dataPath: [...dataPath],
						binaryKey: Buffer.from('1'), // FIX ME WITH REAL KEY
				 });
				}
			}
		}
		return compiledSchema
	}
}

export const codec = new Codec();
