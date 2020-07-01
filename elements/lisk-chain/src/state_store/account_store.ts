/*
 * Copyright © 2019 Lisk Foundation
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
import { NotFoundError, BatchChain } from '@liskhq/lisk-db';
import { Account, DefaultAsset } from '../account';
import { DataAccess } from '../data_access';
import { calculateDiff } from '../diff';
import { StateDiff } from '../types';
import { BufferMap } from '../utils/buffer_map';
import { BufferSet } from '../utils/buffer_set';
import { DB_KEY_ACCOUNTS_ADDRESS } from '../data_access/constants';
import { keyString } from '../utils';
// eslint-disable-next-line import/order
import cloneDeep = require('lodash.clonedeep');

interface AdditionalInformation {
	readonly defaultAsset: object;
}

// FIXME: A lot of type casting
// It is necessary to support generic account asset for the custom transactions now, but with the better type definition, it can be avoided
export class AccountStore {
	private _data: BufferMap<Account>;
	private _originalData: BufferMap<Account>;
	private _updatedKeys: BufferSet;
	private _originalUpdatedKeys: BufferSet;
	private readonly _dataAccess: DataAccess;
	private readonly _defaultAsset: object;
	private readonly _initialAccountValue: BufferMap<Buffer>;

	public constructor(
		dataAccess: DataAccess,
		additionalInformation: AdditionalInformation,
	) {
		this._dataAccess = dataAccess;
		this._data = new BufferMap<Account>();
		this._updatedKeys = new BufferSet();
		this._originalData = new BufferMap();
		this._originalUpdatedKeys = new BufferSet();
		this._defaultAsset = additionalInformation.defaultAsset;
		this._initialAccountValue = new BufferMap<Buffer>();
	}

	public createSnapshot(): void {
		this._originalData = this._data.clone();
		this._updatedKeys = cloneDeep(this._updatedKeys);
	}

	public restoreSnapshot(): void {
		this._data = this._originalData;
		this._updatedKeys = this._originalUpdatedKeys;
		this._originalData = new BufferMap();
		this._originalUpdatedKeys = new BufferSet();
	}

	public async get<T = DefaultAsset>(address: Buffer): Promise<Account<T>> {
		// Account was cached previously so we can return it from memory
		const cachedAccount = this._data.get(address);

		if (cachedAccount) {
			return (new Account(cachedAccount) as unknown) as Account<T>;
		}

		// Account was not cached previously so we try to fetch it from db
		const encodedAccount = await this._dataAccess.getEncodedAccountByAddress(
			address,
		);
		const account = this._getAccountInstance(encodedAccount);

		this._data.set(address, account);
		this._initialAccountValue.set(address, encodedAccount);
		return (account as unknown) as Account<T>;
	}

	public async getOrDefault<T = DefaultAsset>(
		address: Buffer,
	): Promise<Account<T>> {
		// Account was cached previously so we can return it from memory
		const cachedAccount = this._data.get(address);
		if (cachedAccount) {
			return (new Account(cachedAccount) as unknown) as Account<T>;
		}

		// Account was not cached previously so we try to fetch it from db (example delegate account is voted)
		try {
			const encodedAccount = await this._dataAccess.getEncodedAccountByAddress(
				address,
			);
			const account = this._getAccountInstance(encodedAccount);

			this._data.set(address, account);
			this._initialAccountValue.set(address, encodedAccount);
			return (account as unknown) as Account<T>;
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
		}

		// If account does not exists, return default account
		const defaultAccount = Account.getDefaultAccount(
			address,
			cloneDeep<T>((this._defaultAsset as unknown) as T),
		);
		this._data.set(address, (defaultAccount as unknown) as Account);

		return (new Account(defaultAccount) as unknown) as Account<T>;
	}

	public getUpdated<T = DefaultAsset>(): ReadonlyArray<Account<T>> {
		return ([...this._data.values()] as unknown) as ReadonlyArray<Account<T>>;
	}

	public set<T = DefaultAsset>(
		primaryValue: Buffer,
		updatedElement: Account<T>,
	): void {
		this._data.set(primaryValue, (updatedElement as unknown) as Account);
		this._updatedKeys.add(primaryValue);
	}

	public finalize(batch: BatchChain): StateDiff {
		const stateDiff = { updated: [], created: [] } as StateDiff;

		for (const updatedAccount of this._data.values()) {
			if (this._updatedKeys.has(updatedAccount.address)) {
				const encodedAccount = this._dataAccess.encodeAccount(updatedAccount);
				const dbKey = `${DB_KEY_ACCOUNTS_ADDRESS}:${keyString(
					updatedAccount.address,
				)}`;
				batch.put(dbKey, encodedAccount);

				if (this._initialAccountValue.has(updatedAccount.address)) {
					const initialAccount = this._initialAccountValue.get(
						updatedAccount.address,
					);

					const diff = calculateDiff(initialAccount as Buffer, encodedAccount);
					stateDiff.updated.push({
						key: dbKey,
						value: diff,
					});
				} else {
					stateDiff.created.push(dbKey);
				}
			}
		}

		return stateDiff;
	}

	private _getAccountInstance<T>(encodedAccount: Buffer): Account {
		const decodedAccount = this._dataAccess.decodeAccount<T>(encodedAccount);
		return (new Account(decodedAccount) as unknown) as Account;
	}
}
