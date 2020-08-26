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
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
// eslint-disable-next-line @typescript-eslint/no-require-imports
import { objects } from '@liskhq/lisk-utils';
import { BlockHeader, Account, AccountDefaultProps } from '../../types';

interface AccountState {
	get(address: Buffer): Promise<Account<any>>;
	getOrDefault(address: Buffer): Promise<Account<any>>;
	set(address: Buffer, account: any): void;
	del(address: Buffer): Promise<void>;
	getUpdated(): Account[];
}

interface ChainState {
	lastBlockHeaders: BlockHeader[];
	lastBlockReward: bigint;
	networkIdentifier: Buffer;
	get(key: string): Promise<Buffer | undefined>;
	set(address: string, value: Buffer): void;
}

interface ConsensusState {
	get(key: string): Promise<Buffer | undefined>;
	set(address: string, value: Buffer): void;
}

export interface MockInput {
	accounts?: Account<any>[];
	defaultAccount?: AccountDefaultProps;
	chain?: { [key: string]: Buffer };
	consensus?: { [key: string]: Buffer };
	lastBlockHeaders?: Partial<BlockHeader>[];
	networkIdentifier?: Buffer;
	lastBlockReward?: bigint;
}

const defaultNetworkIdentifier = Buffer.from('', 'hex');

export class StateStoreMock {
	public accountData: { address: Buffer }[];
	public chainData: { [key: string]: Buffer };
	public consensusData: { [key: string]: Buffer };

	public account: AccountState;
	public chain: ChainState;
	public consensus: ConsensusState;

	private readonly _defaultAccount: AccountDefaultProps;

	public constructor({
		accounts,
		chain,
		consensus,
		defaultAccount,
		lastBlockHeaders,
		lastBlockReward,
		networkIdentifier,
	}: MockInput = {}) {
		// Make sure to be deep copy
		this.accountData = accounts?.map(a => ({ ...a })) ?? [];
		this.chainData = chain ?? {};
		this.consensusData = consensus ?? {};
		this._defaultAccount = defaultAccount ?? {};

		this.account = {
			// eslint-disable-next-line @typescript-eslint/require-await
			get: async <T = any>(address: Buffer): Promise<Account<T>> => {
				const account = this.accountData.find(acc => acc.address.equals(address));
				if (!account) {
					throw new Error('Account not defined');
				}
				return objects.cloneDeep(account) as Account<T>;
			},
			// eslint-disable-next-line @typescript-eslint/require-await
			getOrDefault: async <T = any>(address: Buffer): Promise<Account<T>> => {
				const account = this.accountData.find(acc => acc.address.equals(address));
				if (!account) {
					return objects.cloneDeep({ ...this._defaultAccount, address }) as Account<T>;
				}
				return objects.cloneDeep(account) as Account<T>;
			},
			getUpdated: () => this.accountData,
			set: <T = any>(address: Buffer, account: Account<T>): void => {
				const index = this.accountData.findIndex(acc => acc.address.equals(address));
				if (index > -1) {
					this.accountData[index] = account;
					return;
				}
				this.accountData.push(account);
			},
			// eslint-disable-next-line @typescript-eslint/require-await
			del: async (address: Buffer): Promise<void> => {
				const index = this.accountData.findIndex(acc => acc.address.equals(address));
				if (index < 0) {
					throw new Error('Cannot delete not existing account');
				}
				this.accountData.splice(index, 1);
			},
		};

		this.chain = {
			networkIdentifier: networkIdentifier ?? defaultNetworkIdentifier,
			lastBlockHeaders: (lastBlockHeaders as BlockHeader[]) ?? [],
			lastBlockReward: lastBlockReward ?? BigInt(0),
			get: async (key: string): Promise<Buffer | undefined> =>
				Promise.resolve(objects.cloneDeep(this.chainData[key])),
			set: (key: string, value: Buffer): void => {
				this.chainData[key] = value;
			},
		};

		this.consensus = {
			get: async (key: string): Promise<Buffer | undefined> =>
				Promise.resolve(objects.cloneDeep(this.consensusData[key])),
			set: (key: string, value: Buffer): void => {
				this.consensusData[key] = value;
			},
		};
	}
}
