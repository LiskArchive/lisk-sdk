export interface GenericObject {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: GenericObject | string | number | Buffer | Array<any>;
}
export interface SchemaPair {
	readonly [key: string]: SchemaProps;
}
export interface Schema {
	readonly $id: string;
	readonly type: string;
	properties: SchemaPair;
}
export interface SchemaProps {
	readonly fieldNumber: number;
	readonly type?: string;
	readonly dataType?: string;
	readonly properties?: SchemaPair;
	readonly items?: SchemaProps;
}
export interface SchemaScalarType {
	readonly dataType?: string;
	readonly type?: string;
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
