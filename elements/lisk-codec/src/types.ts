export interface GenericObject {
	[key: string]: GenericObject | string | number | Buffer;
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
	readonly items?: SchemaProps | SchemaScalarType;
}
export interface SchemaScalarType {
	readonly dataType: string;
}

export interface CompiledSchema {
	schemaProp: SchemaProps;
	propertyName: string;
	binaryKey: Buffer;
	dataPath: string[];
}

export interface CompiledSchemas {
	[key: string]: CompiledSchema[];
}
