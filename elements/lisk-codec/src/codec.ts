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

interface SchemaPair {
	readonly [key: string]: SchemaProps;
}
interface Schema {
	readonly $id: string;
	readonly type: string;
	properties: SchemaPair;
}
interface SchemaProps {
	readonly fieldNumber: number;
	readonly type?: string;
	readonly dataType?: string;
	readonly properties?: SchemaPair;
	readonly items?: SchemaProps | SchemaScalarType;
}
interface SchemaScalarType {
	readonly dataType: string;
}

interface CompiledSchema {
	schemaProp: SchemaProps;
	propertyName: string;
	binaryKey: number;
	dataPath: string[];
}

interface CompiledSchemas {
	[key: string]: CompiledSchema[];
}

interface GenericObject {
	[key: string]: GenericObject | string | number;
}

// interface DataTypeWriters {
// 	varInt: (value: number, schema: SchemaProps) => Buffer,
// 	bytes: (value: Buffer, schema: SchemaProps) => Buffer,
// 	string: (value: string, schema: SchemaProps) => Buffer,
// }

export class Codec {
	private readonly _compileSchemas: CompiledSchemas = {};
	// private readonly _writers: DataTypeWriters = {
	// };

	public addSchema(schema: Schema): void {
		const schemaName = schema.$id;
		this._compileSchemas[schemaName] = this.compileSchema(
			schema.properties,
			[],
			[],
		);
	}

	public encode(schema: Schema, message: GenericObject): string {
		if (this._compileSchemas[schema.$id] === undefined) {
			this.addSchema(schema);
		}

		const encoder = this._compileSchemas[schema.$id];

		let binaryMessage = '';
		// eslint-disable-next-line @typescript-eslint/prefer-for-of
		for (let i = 0; i < encoder.length; i += 1) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const pathToValue = findObjectByPath(message, encoder[i].dataPath);
			if (pathToValue === undefined) {
				throw new Error(
					'Compiled schema contains an invalid path to a property this should never happen',
				);
			}
			const value = pathToValue[encoder[i].propertyName];
			const { dataPath } = encoder[i];
			binaryMessage += `key|${JSON.stringify(value)},${dataPath.join('.')}`;
		}

		return binaryMessage;
	}

	// eslint-disable-next-line
	public decode<T>(_schema: object, _message: Buffer): T {
		return {} as T;
	}

	private compileSchema(
		schema: SchemaPair,
		compiledSchema: CompiledSchema[],
		dataPath: string[],
	): CompiledSchema[] {
		const currentDepthSchema = Object.entries(schema).sort(
			(a, b) => a[1].fieldNumber - b[1].fieldNumber,
		);

		for (const [propertyName, schemaProp] of currentDepthSchema) {
			if (schemaProp.dataType === 'object') {
				dataPath.push(propertyName);
				if (!schemaProp.properties) {
					throw new Error('Sub schema is missing its properties.');
				}
				this.compileSchema(schemaProp.properties, compiledSchema, dataPath);
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
