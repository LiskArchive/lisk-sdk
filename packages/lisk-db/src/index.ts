import { AbstractBatch } from 'abstract-leveldown';
import levelup, { LevelUp } from 'levelup';
import RocksDB from 'rocksdb';

const delimitor = ':';
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

export class DB {
	private _db: LevelUp<RocksDB>;

	public constructor(file: string) {
		this._db = levelup(RocksDB(file));
	}

	// tslint:disable-next-line no-any
	public async get(bucket: string, key: string | number): Promise<any> {
		const fullKey = `${bucket}${delimitor}${key}`;

		return this._db.get(fullKey);
	}

	// tslint:disable-next-line no-any
	public async put(bucket: string, key: string, val: any): Promise<void> {
		const fullKey = `${bucket}${delimitor}${key}`;

		return this._db.put(fullKey, val);
	}

	public async del(bucket: string, key: string): Promise<void> {
		const fullKey = `${bucket}${delimitor}${key}`;

		return this._db.del(fullKey);
	}

	public createReadStream(options?: ReadStreamOption): NodeJS.ReadableStream {
		return this._db.createReadStream(options);
	}

	public async batch(tasks: ReadonlyArray<BatchCommand>): Promise<void> {
		const execTasks = tasks.map(t => ({
			type: t.type,
			key: `${t.bucket}${typeof t.key === 'string' ? t.key : t.key.toString()}`,
			value: t.value,
		}));

		return this._db.batch(execTasks as AbstractBatch[]);
	}
}
