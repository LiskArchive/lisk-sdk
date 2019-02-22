import { AbstractBatch } from 'abstract-leveldown';
import levelup, { LevelUp } from 'levelup';
import RocksDB from 'rocksdb';

const delimitor = ':';
export type Value = string | Buffer;
export interface BatchCommand {
	readonly type: 'put' | 'del';
	readonly bucket: string;
	readonly key: string | number;
	readonly value?: Value;
}

export interface ReadStreamOption {
	readonly gt?: Value;
	readonly gte?: Value;
	readonly lt?: Value;
	readonly lte?: Value;
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

	public async get(bucket: string, key: string): Promise<Value> {
		const fullKey = `${bucket}${delimitor}${key}`;

		return this._db.get(fullKey);
	}

	public async put(bucket: string, key: string, val: Value): Promise<void> {
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
		}))

		return this._db.batch(execTasks as AbstractBatch[]);
	}
}
