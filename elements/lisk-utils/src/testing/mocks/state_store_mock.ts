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
import cloneDeep = require('lodash.clonedeep');

type BlockHeader = any;
type Account = any;

interface AccountState {
	get(address: Buffer): Promise<Account>;
	getOrDefault(address: Buffer): Promise<Account>;
	set(address: Buffer, account: any): void;
}

interface ChainState {
	lastBlockHeader: BlockHeader;
	lastBlockReward: bigint;
	networkIdentifier: Buffer;
	get(key: string): Promise<Buffer | undefined>;
	set(address: string, value: Buffer): void;
}

interface ConsensusState {
	lastBlockHeaders: BlockHeader[];
	get(key: string): Promise<Buffer | undefined>;
	set(address: string, value: Buffer): void;
}

export interface MockInput {
	accounts?: Account[];
	defaultAccount?: Account;
	chain?: { [key: string]: Buffer };
	consensus?: { [key: string]: Buffer };
	lastBlockHeaders?: BlockHeader[];
	networkIdentifier?: Buffer;
	lastBlockReward?: bigint;
}

const defaultNetworkIdentifier = Buffer.from('', 'base64');

export class StateStoreMock {
	public accountData: { address: Buffer }[];
	public chainData: { [key: string]: Buffer };
	public consensusData: { [key: string]: Buffer };

	public account: AccountState;
	public chain: ChainState;
	public consensus: ConsensusState;

	private readonly _defaultAccount: Account;

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
			get: async (address: Buffer): Promise<Account> => {
				const account = this.accountData.find(acc => acc.address.equals(address));
				if (!account) {
					throw new Error('Account not defined');
				}
				return cloneDeep(account);
			},
			// eslint-disable-next-line @typescript-eslint/require-await
			getOrDefault: async (address: Buffer): Promise<Account> => {
				const account = this.accountData.find(acc => acc.address.equals(address));
				if (!account) {
					return cloneDeep({ ...this._defaultAccount, address });
				}
				return cloneDeep(account);
			},
			set: (address: Buffer, account: Account): void => {
				const index = this.accountData.findIndex(acc => acc.address.equals(address));
				if (index > -1) {
					this.accountData[index] = account;
					return;
				}
				this.accountData.push(account);
			},
		};

		this.chain = {
			networkIdentifier: networkIdentifier ?? defaultNetworkIdentifier,
			lastBlockHeader: lastBlockHeaders && lastBlockHeaders.length > 0 ? lastBlockHeaders[0] : {},
			lastBlockReward: lastBlockReward ?? BigInt(0),
			get: async (key: string): Promise<Buffer | undefined> =>
				Promise.resolve(cloneDeep(this.chainData[key])),
			set: (key: string, value: Buffer): void => {
				this.chainData[key] = value;
			},
		};

		this.consensus = {
			lastBlockHeaders: lastBlockHeaders ?? [],
			get: async (key: string): Promise<Buffer | undefined> =>
				Promise.resolve(cloneDeep(this.consensusData[key])),
			set: (key: string, value: Buffer): void => {
				this.consensusData[key] = value;
			},
		};
	}
}
