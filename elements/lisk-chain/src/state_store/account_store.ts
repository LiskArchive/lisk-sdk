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
import { objects, dataStructures } from '@liskhq/lisk-utils';
import { DataAccess } from '../data_access';
import { StateDiff, Account, AccountDefaultProps } from '../types';
import { DB_KEY_ACCOUNTS_ADDRESS } from '../data_access/constants';
import { keyString } from '../utils';

interface AdditionalInformation {
	readonly defaultAccount: Record<string, unknown>;
}

// FIXME: A lot of type casting
// It is necessary to support generic account asset for the custom transactions now, but with the better type definition, it can be avoided
export class AccountStore {
	private _data: dataStructures.BufferMap<Account>;
	private _originalData: dataStructures.BufferMap<Account>;
	private _updatedKeys: dataStructures.BufferSet;
	private _originalUpdatedKeys: dataStructures.BufferSet;
	private readonly _dataAccess: DataAccess;
	private readonly _defaultAccount: Record<string, unknown>;
	private readonly _initialAccountValue: dataStructures.BufferMap<Buffer>;

	public constructor(dataAccess: DataAccess, additionalInformation: AdditionalInformation) {
		this._dataAccess = dataAccess;
		this._data = new dataStructures.BufferMap<Account>();
		this._updatedKeys = new dataStructures.BufferSet();
		this._originalData = new dataStructures.BufferMap();
		this._originalUpdatedKeys = new dataStructures.BufferSet();
		this._defaultAccount = additionalInformation.defaultAccount;
		this._initialAccountValue = new dataStructures.BufferMap<Buffer>();
	}

	public createSnapshot(): void {
		this._originalData = this._data.clone();
		this._updatedKeys = objects.cloneDeep(this._updatedKeys);
	}

	public restoreSnapshot(): void {
		this._data = this._originalData;
		this._updatedKeys = this._originalUpdatedKeys;
		this._originalData = new dataStructures.BufferMap();
		this._originalUpdatedKeys = new dataStructures.BufferSet();
	}

	public async get<T = AccountDefaultProps>(address: Buffer): Promise<Account<T>> {
		// Account was cached previously so we can return it from memory
		const cachedAccount = this._data.get(address);

		if (cachedAccount) {
			return (objects.cloneDeep(cachedAccount) as unknown) as Account<T>;
		}

		// Account was not cached previously so we try to fetch it from db
		const encodedAccount = await this._dataAccess.getEncodedAccountByAddress(address);
		const account = this._getAccountInstance(encodedAccount);

		this._data.set(address, account as Account);
		this._initialAccountValue.set(address, encodedAccount);
		return (account as unknown) as Account<T>;
	}

	public async getOrDefault<T = AccountDefaultProps>(address: Buffer): Promise<Account<T>> {
		// Account was cached previously so we can return it from memory
		const cachedAccount = this._data.get(address);
		if (cachedAccount) {
			return (objects.cloneDeep(cachedAccount) as unknown) as Account<T>;
		}

		// Account was not cached previously so we try to fetch it from db (example delegate account is voted)
		try {
			const encodedAccount = await this._dataAccess.getEncodedAccountByAddress(address);
			const account = this._getAccountInstance(encodedAccount);

			this._data.set(address, account as Account);
			this._initialAccountValue.set(address, encodedAccount);
			return (account as unknown) as Account<T>;
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
		}

		// If account does not exists, return default account
		const defaultAccount = ({
			address,
			...objects.cloneDeep<T>((this._defaultAccount as unknown) as T),
		} as unknown) as Account<T>;
		this._data.set(address, (defaultAccount as unknown) as Account);

		return defaultAccount;
	}

	public getUpdated<T = AccountDefaultProps>(): ReadonlyArray<Account<T>> {
		return ([...this._data.values()] as unknown) as ReadonlyArray<Account<T>>;
	}

	public set<T = AccountDefaultProps>(primaryValue: Buffer, updatedElement: Account<T>): void {
		this._data.set(primaryValue, (updatedElement as unknown) as Account);
		this._updatedKeys.add(primaryValue);
	}

	public finalize(batch: BatchChain): StateDiff {
		const stateDiff = { updated: [], created: [] } as StateDiff;

		for (const updatedAccount of this._data.values()) {
			if (this._updatedKeys.has(updatedAccount.address)) {
				const encodedAccount = this._dataAccess.encodeAccount(updatedAccount);
				const dbKey = `${DB_KEY_ACCOUNTS_ADDRESS}:${keyString(updatedAccount.address)}`;
				batch.put(dbKey, encodedAccount);

				const initialAccount = this._initialAccountValue.get(updatedAccount.address);
				if (initialAccount !== undefined && !initialAccount.equals(encodedAccount)) {
					stateDiff.updated.push({
						key: dbKey,
						value: initialAccount,
					});
				} else if (initialAccount === undefined) {
					stateDiff.created.push(dbKey);
				}
			}
		}

		return stateDiff;
	}

	private _getAccountInstance<T>(encodedAccount: Buffer): Account<T> {
		const decodedAccount = this._dataAccess.decodeAccount<T>(encodedAccount);
		return (objects.cloneDeep(decodedAccount) as unknown) as Account<T>;
	}
}
