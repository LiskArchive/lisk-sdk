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

export type BaseTypes = string | number | Buffer | bigint | boolean;

export interface GenericObject {
	[key: string]: GenericObject | BaseTypes | Array<BaseTypes | GenericObject>;
}

export interface SchemaPair {
	readonly [key: string]: SchemaProps;
}

export interface Schema {
	readonly $id: string;
	readonly type: string;
	readonly properties: Record<string, unknown>;
	readonly required?: string[];
}

export interface ValidatedSchema {
	readonly $id: string;
	readonly $schema: string;
	readonly type: string;
	readonly required?: string[];
	properties: SchemaPair;
}

export interface SchemaProps {
	readonly fieldNumber: number;
	readonly type?: string;
	readonly dataType?: string;
	readonly format?: string;
	readonly properties?: SchemaPair;
	readonly items?: SchemaObjectItem | SchemaScalarItem;
}

export interface SchemaObjectItem {
	readonly type: 'object';
	readonly fieldNumber: number;
	readonly properties: SchemaPair;
}

export interface SchemaScalarItem {
	readonly dataType: string;
	readonly type?: undefined;
	readonly format?: string;
}

export interface CompiledSchema {
	schemaProp: SchemaProps;
	propertyName: string;
	binaryKey: Buffer;
	dataPath: string[];
}

export type CompiledSchemasArray = Array<CompiledSchema | CompiledSchema[]>;

export interface CompiledSchemas {
	[key: string]: CompiledSchemasArray;
}

export interface Validator {
	addMetaSchema: (schema: Record<string, unknown>, key?: string) => void;
}
export interface IteratorReturnValue {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	value: any;
	key: string;
}

export interface IteratableGenericObject extends GenericObject {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[Symbol.iterator](): Iterator<IteratorReturnValue>;
}
