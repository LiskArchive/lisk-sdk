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

import { validator, liskSchemaIdentifier } from '@liskhq/lisk-validator';
import { objects as objectUtils } from '@liskhq/lisk-utils';
import { generateKey } from './utils';
import { readObject, writeObject } from './collection';

import {
	Schema,
	CompiledSchema,
	CompiledSchemas,
	CompiledSchemasArray,
	GenericObject,
	IteratableGenericObject,
	ValidatedSchema,
	SchemaProps,
} from './types';

import { iterator, recursiveTypeCast } from './json_wrapper';

export const validateSchema = (schema: {
	// eslint-disable-next-line
	[key: string]: any;
	$schema?: string;
	$id?: string;
}): boolean => {
	// TODO: https://github.com/ajv-validator/ajv/issues/1221
	//
	// Ajv compiles schema and cache it when either "validate" or "compile" called
	//
	// Due to issue mentioned above we have to compile the schema
	// manually our self. That requires to clear the cache manually so
	// any subsequent request to validate or compile may not fail.
	//
	// We have to clear cache once on start and once at the end
	// to cover both cases in which order "validate" or "compile"
	// is called from main code.

	validator.removeSchema(schema.$id);

	const schemaToValidate = {
		...schema,
		$schema: schema.$schema ?? liskSchemaIdentifier,
	};

	validator.validateSchema(schemaToValidate);

	try {
		// To validate keyword schema we have to compile it
		// Ajv `validateSchema` does not validate keyword meta schema
		// https://github.com/ajv-validator/ajv/issues/1221
		validator.compile(schemaToValidate);
	} finally {
		validator.removeSchema(schema.$id);
	}

	return true;
};

export class Codec {
	private _compileSchemas: CompiledSchemas = {};

	public addSchema(schema: Schema): boolean {
		validateSchema(schema);

		const schemaName = schema.$id;
		this._compileSchemas[schemaName] = this._compileSchema(schema as ValidatedSchema, [], []);

		return true;
	}

	public encode(schema: Schema, message: object): Buffer {
		if (this._compileSchemas[schema.$id] === undefined) {
			this.addSchema(schema);
		}

		const compiledSchema = this._compileSchemas[schema.$id];
		const res = writeObject(compiledSchema, message as GenericObject, []);
		return Buffer.concat(res[0]);
	}

	public decode<T>(schema: Schema, message: Buffer): T {
		if (this._compileSchemas[schema.$id] === undefined) {
			this.addSchema(schema);
		}
		const compiledSchema = this._compileSchemas[schema.$id];
		const [res] = readObject(message, 0, compiledSchema, message.length);

		return res as unknown as T;
	}

	// For performance applications use decode() instead!
	public decodeJSON<T>(schema: Schema, message: Buffer): T {
		const decodedMessage: IteratableGenericObject = this.decode(schema, message);

		const jsonMessageAsObject = this.toJSON(schema, decodedMessage);
		return jsonMessageAsObject as unknown as T;
	}

	// For performance applications use encode() instead!
	public encodeJSON(schema: Schema, message: object): Buffer {
		const objectFromJson = this.fromJSON(schema, message);
		return this.encode(schema, objectFromJson);
	}

	public toJSON<T = object>(schema: Schema, message: object): T {
		const messageCopy = objectUtils.cloneDeep(message);
		(messageCopy as IteratableGenericObject)[Symbol.iterator] = iterator;

		recursiveTypeCast(
			'toJSON',
			messageCopy as IteratableGenericObject,
			schema as unknown as SchemaProps,
			[],
		);
		return messageCopy as unknown as T;
	}

	public fromJSON<T = object>(schema: Schema, message: object): T {
		const messageCopy = objectUtils.cloneDeep(message);
		(messageCopy as IteratableGenericObject)[Symbol.iterator] = iterator;

		recursiveTypeCast(
			'fromJSON',
			messageCopy as IteratableGenericObject,
			schema as unknown as SchemaProps,
			[],
		);
		return messageCopy as unknown as T;
	}

	public clearCache(): void {
		this._compileSchemas = {};
	}

	private _compileSchema(
		schema: ValidatedSchema | SchemaProps,
		compiledSchema: CompiledSchemasArray,
		dataPath: string[],
	): CompiledSchemasArray {
		if (schema.type === 'object') {
			const { properties } = schema;
			if (properties === undefined) {
				throw new Error('Invalid schema. Missing "properties" property');
			}
			for (const property of Object.values(properties)) {
				if (!('fieldNumber' in property)) {
					throw new Error('Invalid schema. Missing "fieldNumber" in properties');
				}
			}
			const currentDepthSchema = Object.entries(properties).sort(
				(a, b) => a[1].fieldNumber - b[1].fieldNumber,
			);

			for (let i = 0; i < currentDepthSchema.length; i += 1) {
				const [schemaPropertyName, schemaPropertyValue] = currentDepthSchema[i];
				if (schemaPropertyValue.type === 'object') {
					if (!('fieldNumber' in schemaPropertyValue)) {
						throw new Error('Invalid schema. Missing "fieldNumber" in properties');
					}
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
					const res = this._compileSchema(schemaPropertyValue, nestedSchema, dataPath);
					compiledSchema.push(res as CompiledSchema[]);
					dataPath.pop();
				} else if (schemaPropertyValue.type === 'array') {
					// Array recursive case
					if (schemaPropertyValue.items === undefined) {
						throw new Error('Invalid schema. Missing "items" property for Array schema');
					}
					if (!('fieldNumber' in schemaPropertyValue)) {
						throw new Error('Invalid schema. Missing "fieldNumber" in properties');
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
						const res = this._compileSchema(schemaPropertyValue.items, nestedSchema, dataPath);
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
							res as unknown as CompiledSchema,
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
