import levelup, { LevelUp } from 'levelup';
import RocksDB from 'rocksdb';

const delimitor = ':';

export class DB {
	private _db: LevelUp<RocksDB>;

	public constructor(file: string) {
		this._db = levelup(RocksDB(file));
	}

	public async get(bucket: string, key: string): Promise<RocksDB.Bytes> {
		const fullKey = `${bucket}${delimitor}${key}`;

		return this._db.get(fullKey);
	}

	public async put(bucket: string, key: string, val: any): Promise<void> {
		const fullKey = `${bucket}${delimitor}${key}`;

		return this._db.put(fullKey, val);
	}

	public async del(bucket: string, key: string): Promise<void> {
		const fullKey = `${bucket}${delimitor}${key}`;

		return this._db.del(fullKey);
	}
}
