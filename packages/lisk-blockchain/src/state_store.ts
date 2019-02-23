import { DataStore } from './types';

export class StateStore {
	private _db: DataStore;
	public mutate = true;

	public constructor(db: DataStore) {
		this._db = db;
	}

	public async get(bucket: string, key: string): Promise<object> {}

	public async set(
		bucket: string,
		key: string,
		value: unknown,
	): Promise<void> {}

	public async del(bucket: string, key: string): Promise<void> {}

	public createSnapshot(): string {
		return 'snapshotID';
	}

	public restoreSnapshot(snapshotId: string): void {}

	public async finalize(): void {}
}
