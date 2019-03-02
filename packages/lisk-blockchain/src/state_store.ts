import * as crypto from 'crypto';
// tslint:disable-next-line no-require-imports
import clonedeep = require('lodash.clonedeep');
import { Account, createDefaultAccount } from './account';
import { blockSaveToBatch, cacheToBatch, deleteMapToBatch } from './batch';
import { Block } from './block';
import { BUCKET_ADDRESS_ACCOUNT } from './repo';
import { CacheMap, DataStore } from './types';

const SNAPSHOT_ID_LENGTH = 16;
const randomString = (num: number) => crypto.randomBytes(num).toString('hex');

export class StateStore {
	private readonly _db: DataStore;
	private _cacheMap: CacheMap;
	private readonly _deleteMap: Map<string, string>;
	private readonly _snapshot: { [key: string]: CacheMap };
	private readonly _block: Block;

	public constructor(db: DataStore, block: Block) {
		this._db = db;
		this._cacheMap = {};
		this._deleteMap = new Map();
		this._snapshot = {};
		this._block = block;
	}

	public async get<T>(bucket: string, key: string): Promise<T> {
		if (this._cacheMap[bucket] && this._cacheMap[bucket][key]) {
			return clonedeep(this._cacheMap[bucket][key]);
		}

		const result = this._db.get<T>(bucket, key);
		if (!this._cacheMap[bucket]) {
			this._cacheMap[bucket] = {};
		}
		this._cacheMap[bucket][key] = result;

		return clonedeep(result);
	}

	public async getOrDefault(bucket: string, key: string): Promise<Account> {
		if (this._cacheMap[bucket] && this._cacheMap[bucket][key]) {
			return clonedeep(this._cacheMap[bucket][key]);
		}

		try {
			const account = await this._db.get<Account>(bucket, key);

			return account;
		} catch (err) {
			const newAccount = createDefaultAccount(key);
			if (!this._cacheMap[bucket]) {
				this._cacheMap[bucket] = {};
			}
			this._cacheMap[bucket][key] = newAccount;

			return newAccount;
		}
	}

	public async exists(bucket: string, key: string): Promise<boolean> {
		try {
			await this._db.get(bucket, key);

			return true;
		} catch (err) {
			if (err.type === 'NotFoundError') {
				return false;
			}
			throw err;
		}
	}

	public async set(
		bucket: string,
		key: string,
		// tslint:disable-next-line no-any
		value: any,
	): Promise<void> {
		if (!this._cacheMap[bucket]) {
			this._cacheMap[bucket] = {};
		}
		this._cacheMap[bucket][key] = value;
	}

	public async unset(bucket: string, key: string): Promise<void> {
		if (this._cacheMap[bucket] && this._cacheMap[bucket][key]) {
			// tslint:disable-next-line no-delete no-dynamic-delete
			delete this._cacheMap[bucket][key];

			return;
		}

		this._deleteMap.set(bucket, key);
	}
	public async replace(
		bucket: string,
		oldKey: string,
		newKey: string,
		// tslint:disable-next-line no-any
		value: any,
	): Promise<void> {
		if (!this._cacheMap[bucket]) {
			this._cacheMap[bucket] = {};
		}
		// Case old value does not exist in cache
		if (!this._cacheMap[bucket][oldKey]) {
			const exists = await this.exists(bucket, oldKey);
			if (exists) {
				this._deleteMap.set(bucket, oldKey);
			}
			this._cacheMap[bucket][newKey] = value;

			return;
		}
		// Case value exists in cache
		// tslint:disable-next-line no-delete no-dynamic-delete
		delete this._cacheMap[bucket][oldKey];
		this._cacheMap[bucket][newKey] = value;

		return;
	}

	public createSnapshot(): string {
		const id = randomString(SNAPSHOT_ID_LENGTH);
		this._snapshot[id] = clonedeep(this._cacheMap);

		return id;
	}

	public restoreSnapshot(snapshotId: string): void {
		this._cacheMap = this._snapshot[snapshotId];
		// tslint:disable-next-line no-delete no-dynamic-delete
		delete this._snapshot[snapshotId];
	}

	public getUpdatedAccount(): ReadonlyArray<Account> {
		if (!this._cacheMap[BUCKET_ADDRESS_ACCOUNT]) {
			return [];
		}
		const updatedAccounts = Object.values(
			this._cacheMap[BUCKET_ADDRESS_ACCOUNT],
		);

		return updatedAccounts;
	}

	public async finalize(): Promise<void> {
		const txTasks = [
			...blockSaveToBatch(this._block),
			...cacheToBatch(this._cacheMap),
			...deleteMapToBatch(this._deleteMap),
		];

		return this._db.batch(txTasks);
	}
}
