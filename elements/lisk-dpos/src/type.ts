export interface Block {
	readonly height: number;
	readonly timestamp: number;
	readonly totalFee: string;
	readonly reward: string;
	readonly generatorPublicKey: string;
}

export interface BatchCommand {
	readonly type: 'put' | 'del';
	readonly bucket: string;
	readonly key: string | number;
	// tslint:disable-next-line no-any
	readonly value?: any;
}

export interface ReadStreamOption {
	// tslint:disable-next-line no-any
	readonly gt?: any;
	// tslint:disable-next-line no-any
	readonly gte?: any;
	// tslint:disable-next-line no-any
	readonly lt?: any;
	// tslint:disable-next-line no-any
	readonly lte?: any;
	readonly reverse?: boolean;
	readonly limit?: number;
	readonly keys?: boolean;
	readonly values?: boolean;
}

export interface DataStore {
	// tslint:disable-next-line no-any
	get<T>(bucket: string, key: string | number): Promise<T>;
	exists(bucket: string, key: string | number): Promise<boolean>;
	// tslint:disable-next-line no-any
	put<T>(bucket: string, key: string, value: T): Promise<void>;
	del(bucket: string, key: string): Promise<void>;
	batch(tasks: ReadonlyArray<BatchCommand>): Promise<void>;
	createReadStream(options?: ReadStreamOption): NodeJS.ReadableStream;
}
