/*
 * Copyright © 2020 Lisk Foundation
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
import { Account, TransactionJSON } from '../../src/transaction_types';
import {
	StateStoreCache,
	StateStoreDefaultGetter,
	StateStoreGetter,
	StateStoreSetter,
	StateStoreTransactionGetter,
} from '../../src/base_transaction';

export const defaultAccount = {
	publicKey: undefined,
	// tslint:disable-next-line:no-null-keyword
	secondPublicKey: null,
	secondSignature: 0,
	// tslint:disable-next-line:no-null-keyword
	username: null,
	isDelegate: 0,
	balance: BigInt('0'),
	missedBlocks: 0,
	producedBlocks: 0,
	fees: BigInt('0'),
	rewards: BigInt('0'),
	voteWeight: BigInt('0'),
	nameExist: false,
	multiMin: 0,
	multiLifetime: 0,
	// tslint:disable-next-line:no-null-keyword
	votedDelegatesPublicKeys: [],
	asset: {},
	// tslint:disable-next-line:no-null-keyword
	membersPublicKeys: [],
	toJSON: (): object => ({}),
};

export class StateStoreMock {
	readonly account: StateStoreGetter<Account> &
		StateStoreDefaultGetter<Account> &
		StateStoreSetter<Account> &
		StateStoreCache<Account>;
	readonly transaction: StateStoreTransactionGetter<TransactionJSON> &
		StateStoreCache<TransactionJSON>;

	public accountData: Account[];
	public transactionData: TransactionJSON[];

	constructor(initialAccount?: Account[]) {
		// Make sure to be deep copy
		this.accountData = initialAccount
			? initialAccount.map(a => ({ ...a }))
			: [];
		this.transactionData = [];

		this.account = {
			cache: async (
				_filterArray: ReadonlyArray<{ readonly [key: string]: string }>,
			): Promise<ReadonlyArray<Account>> => {
				return [];
			},
			get: async (address: string): Promise<Account> => {
				const account = this.accountData.find(acc => acc.address === address);
				if (!account) {
					throw new Error('Account not defined');
				}
				return { ...account };
			},
			getOrDefault: async (address: string): Promise<Account> => {
				const account = this.accountData.find(acc => acc.address === address);
				if (!account) {
					return { ...defaultAccount, address: address };
				}
				return { ...account };
			},
			find: (func: (item: Account) => boolean): Account | undefined => {
				const account = this.accountData.find(func);
				if (!account) {
					return undefined;
				}
				return account;
			},
			set: (address: string, account: Account): void => {
				const index = this.accountData.findIndex(
					acc => acc.address === address,
				);
				if (index > -1) {
					this.accountData[index] = account;
					return;
				}
				this.accountData.push(account);
			},
		};

		this.transaction = {
			cache: async (
				_filterArray: ReadonlyArray<{ readonly [key: string]: string }>,
			): Promise<ReadonlyArray<TransactionJSON>> => {
				return [];
			},
			get: (key: string): TransactionJSON => {
				const transaction = this.transactionData.find(acc => acc.id === key);
				if (!transaction) {
					throw new Error('Transaction not defined');
				}
				return { ...transaction };
			},
			find: (
				func: (item: TransactionJSON) => boolean,
			): TransactionJSON | undefined => {
				const transaction = this.transactionData.find(func);
				if (!transaction) {
					return undefined;
				}
				return transaction;
			},
		};
	}
}
