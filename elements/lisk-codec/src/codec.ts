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

import { generateKey } from './utils';

import {
	CompiledSchema,
	CompiledSchemas,
	CompiledSchemasArray,
	GenericObject,
	Schema,
	SchemaProps,
} from './types';

import { writeObject } from './collection';

export class Codec {
	private readonly _compileSchemas: CompiledSchemas = {};

	public addSchema(schema: Schema): void {
		const schemaName = schema.$id;
		this._compileSchemas[schemaName] = this._compileSchema(schema, [], []);
	}

	public encode(schema: Schema, message: GenericObject): Buffer {
		if (this._compileSchemas[schema.$id] === undefined) {
			this.addSchema(schema);
		}
		const compiledSchema = this._compileSchemas[schema.$id];
		const res = writeObject(compiledSchema, message, []);
		return Buffer.concat(res[0]);
	}

	// eslint-disable-next-line
	public decode<T>(_schema: object, _message: Buffer): T {
		return {} as T;
	}

	private _compileSchema(
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
				if (schemaPropertyValue.type === 'object') {
					// Object recursive case
					dataPath.push(schemaPropertyName);
					const nestedSchema = [
						{
							propertyName: schemaPropertyName,
							schemaProp: {
								type: schemaPropertyValue.type,
								fieldNumber: schemaPropertyValue.fieldNumber,
							},
							dataPath: [...dataPath],
							binaryKey: generateKey(schemaPropertyValue),
						},
					];
					const res = this._compileSchema(
						schemaPropertyValue,
						nestedSchema,
						dataPath,
					);
					compiledSchema.push(res as CompiledSchema[]);
					dataPath.pop();
				} else if (schemaPropertyValue.type === 'array') {
					// Array recursive case
					if (schemaPropertyValue.items === undefined) {
						throw new Error(
							'Invalid schema. Missing "items" property for Array schema',
						);
					}
					dataPath.push(schemaPropertyName);
					if (schemaPropertyValue.items.type === 'object') {
						const nestedSchema = [
							{
								propertyName: schemaPropertyName,
								schemaProp: {
									type: 'object',
									fieldNumber: schemaPropertyValue.fieldNumber,
								},
								dataPath: [...dataPath],
								binaryKey: generateKey(schemaPropertyValue),
							},
						];
						const res = this._compileSchema(
							schemaPropertyValue.items,
							nestedSchema,
							dataPath,
						);
						compiledSchema.push([
							{
								propertyName: schemaPropertyName,
								schemaProp: {
									type: schemaPropertyValue.type,
									fieldNumber: schemaPropertyValue.fieldNumber,
								},
								dataPath: [...dataPath],
								binaryKey: generateKey(schemaPropertyValue),
							},
							(res as unknown) as CompiledSchema,
						]);
						dataPath.pop();
					} else {
						compiledSchema.push([
							{
								propertyName: schemaPropertyName,
								schemaProp: {
									type: schemaPropertyValue.type,
									fieldNumber: schemaPropertyValue.fieldNumber,
								},
								dataPath: [...dataPath],
								binaryKey: generateKey(schemaPropertyValue),
							},
							{
								propertyName: schemaPropertyName,
								schemaProp: {
									dataType: schemaPropertyValue.items.dataType,
									fieldNumber: schemaPropertyValue.fieldNumber,
								},
								dataPath: [...dataPath],
								binaryKey: generateKey(schemaPropertyValue),
							},
						]);
						dataPath.pop();
					}
				} else {
					// Base case
					compiledSchema.push({
						propertyName: schemaPropertyName,
						schemaProp: schemaPropertyValue,
						dataPath: [...dataPath],
						binaryKey: generateKey(schemaPropertyValue),
					});
				}
			}
		}
		return compiledSchema;
	}
}

export const codec = new Codec();
