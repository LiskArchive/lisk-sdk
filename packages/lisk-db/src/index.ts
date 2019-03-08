import { AbstractBatch } from 'abstract-leveldown';
import EncodingDown from 'encoding-down';
// tslint:disable-next-line match-default-export-name
import levelup, { LevelUp } from 'levelup';
import RocksDB from 'rocksdb';
import { debug } from 'debug';

const logger = debug('db');

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
	private readonly _db: LevelUp<RocksDB>;

	public constructor(file: string) {
		logger('opening file', { file });
		this._db = levelup(EncodingDown(RocksDB(file), { valueEncoding: 'json' }));
	}

	public async close(): Promise<void> {
		return this._db.close();
	}

	// tslint:disable-next-line no-any
	public async get(bucket: string, key: string | number): Promise<any> {
		const fullKey = `${bucket}${delimitor}${key}`;

		logger('get', { key: fullKey });
		return this._db.get(fullKey);
	}

	// tslint:disable-next-line no-any
	public async exists(bucket: string, key: string | number): Promise<boolean> {
		const fullKey = `${bucket}${delimitor}${key}`;
		try {
			logger('exists', { key: fullKey });
			await this._db.get(fullKey);

			return true;
		} catch (error) {
			if (error.notFound) {
				return false;
			}
			throw error;
		}
	}

	// tslint:disable-next-line no-any
	public async put(bucket: string, key: string, val: any): Promise<void> {
		const fullKey = `${bucket}${delimitor}${key}`;

		logger('put', { key: fullKey });
		return this._db.put(fullKey, val);
	}

	public async del(bucket: string, key: string): Promise<void> {
		const fullKey = `${bucket}${delimitor}${key}`;

		logger('del', { key: fullKey });
		return this._db.del(fullKey);
	}

	public createReadStream(options?: ReadStreamOption): NodeJS.ReadableStream {
		logger('readStream', { options });
		return this._db.createReadStream(options);
	}

	public async batch(tasks: ReadonlyArray<BatchCommand>): Promise<void> {
		const execTasks = tasks.map(t => ({
			type: t.type,
			key: `${t.bucket}${delimitor}${
				typeof t.key === 'string' ? t.key : t.key.toString()
			}`,
			value: t.value,
		}));

		return this._db.batch(execTasks as AbstractBatch[]);
	}
}
