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
import { stateDiffSchema } from '../schema';
import { calculateDiff } from '../diff';
import { BufferMap } from '../utils/buffer_map';
import { BufferSet } from '../utils/buffer_set';
import { DB_KEY_ACCOUNTS_ADDRESS } from '../data_access/constants';
import { keyString } from '../utils';
// eslint-disable-next-line @typescript-eslint/no-require-imports
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
	private readonly _defualtAsset: object;
	private readonly _primaryKey = 'address';
	private readonly _name = 'Account';
	private _initialAccountValue = {} as Account;

	public constructor(
		dataAccess: DataAccess,
		additionalInformation: AdditionalInformation,
	) {
		this._dataAccess = dataAccess;
		this._data = new BufferMap<Account>();
		this._updatedKeys = new BufferSet();
		this._primaryKey = 'address';
		this._name = 'Account';
		this._originalData = new BufferMap();
		this._originalUpdatedKeys = new BufferSet();
		this._defualtAsset = additionalInformation.defaultAsset;
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

	public async get<T = DefaultAsset>(
		primaryValue: Buffer,
	): Promise<Account<T>> {
		// Account was cached previously so we can return it from memory
		const element = this._data.get(primaryValue);

		if (element) {
			return (new Account(element) as unknown) as Account<T>;
		}

		// Account was not cached previously so we try to fetch it from db
		const elementFromDB = await this._dataAccess.getAccountByAddress(
			primaryValue,
		);

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (elementFromDB) {
			this._data.set(primaryValue, elementFromDB as Account);
			this._initialAccountValue = elementFromDB as Account;

			return (new Account(elementFromDB) as unknown) as Account<T>;
		}

		// Account does not exist we can not continue
		throw new Error(
			`${this._name} with ${this._primaryKey} = ${primaryValue.toString(
				'hex',
			)} does not exist`,
		);
	}

	public async getOrDefault<T = DefaultAsset>(
		primaryValue: Buffer,
	): Promise<Account<T>> {
		// Account was cached previously so we can return it from memory
		const element = this._data.get(primaryValue);
		if (element) {
			return (new Account(element) as unknown) as Account<T>;
		}

		// Account was not cached previously so we try to fetch it from db (example delegate account is voted)
		try {
			const elementFromDB = await this._dataAccess.getAccountByAddress(
				primaryValue,
			);
			this._data.set(primaryValue, elementFromDB as Account);
			this._initialAccountValue = elementFromDB as Account;

			return (new Account(elementFromDB as Account) as unknown) as Account<T>;
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
		}

		// If account does not exists, return default account
		const defaultElement = Account.getDefaultAccount(
			primaryValue,
			cloneDeep<T>((this._defualtAsset as unknown) as T),
		);
		this._data.set(primaryValue, (defaultElement as unknown) as Account);

		return (new Account(defaultElement) as unknown) as Account<T>;
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

	public finalize(batch: BatchChain): void {
		for (const account of this._data.values()) {
			if (this._updatedKeys.has(account.address)) {
				const encodedFinalAccount = this._dataAccess.encodeAccount(account);
				const encodedInitialAccount = this._dataAccess.encodeAccount(this._initialAccountValue);
				batch.put(
					`${DB_KEY_ACCOUNTS_ADDRESS}:${keyString(account.address)}`,
					encodedAccount,
				);
			}
		}
	}
}
