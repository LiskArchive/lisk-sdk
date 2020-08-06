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
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { hexToBuffer } from '@liskhq/lisk-cryptography';
import { BlockHeader } from '@liskhq/lisk-chain';
import { defaultAccount } from './account';

interface Account<T = any> {
	readonly address: Buffer;
	balance: bigint;
	nonce: bigint;
	keys: {
		mandatoryKeys: Buffer[];
		optionalKeys: Buffer[];
		numberOfSignatures: number;
	};
	asset: T;
}

export interface ChainState {
	readonly lastBlockHeader: BlockHeader;
	readonly lastBlockReward: bigint;
	readonly networkIdentifier: Buffer;
	get(key: string): Promise<Buffer | undefined>;
	set(key: string, value: Buffer): void;
}

interface AccountState {
	get<T>(key: Buffer): Promise<Account<T>>;
	getOrDefault<T>(key: Buffer): Promise<Account<T>>;
	set<T>(key: Buffer, value: Account<T>): void;
}

export const defaultNetworkIdentifier =
	'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255';

export interface AdditionalInfo {
	readonly networkIdentifier?: string;
	readonly lastBlockHeader?: BlockHeader;
	readonly lastBlockReward?: bigint;
	readonly chainData?: { [key: string]: Buffer };
}

export class StateStoreMock {
	readonly account: AccountState;
	readonly chain: ChainState;

	public accountData: Account[];
	public chainData: { [key: string]: Buffer };

	constructor(initialAccount?: Account[], additionalInfo?: AdditionalInfo) {
		// Make sure to be deep copy
		this.accountData = initialAccount ? initialAccount.map(a => ({ ...a })) : [];
		this.chainData = additionalInfo?.chainData ?? {};

		this.account = {
			// eslint-disable-next-line @typescript-eslint/require-await
			get: async (address: Buffer): Promise<Account> => {
				const account = this.accountData.find(acc => acc.address.equals(address));
				if (!account) {
					throw new Error('Account not defined');
				}
				return { ...account };
			},
			// eslint-disable-next-line @typescript-eslint/require-await
			getOrDefault: async (address: Buffer): Promise<Account> => {
				const account = this.accountData.find(acc => acc.address.equals(address));
				if (!account) {
					return { ...defaultAccount({}), address };
				}
				return { ...account };
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
			networkIdentifier: hexToBuffer(additionalInfo?.networkIdentifier ?? defaultNetworkIdentifier),
			lastBlockHeader: additionalInfo?.lastBlockHeader ?? ({} as BlockHeader),
			lastBlockReward: additionalInfo?.lastBlockReward ?? BigInt(0),
			get: async (key: string): Promise<Buffer | undefined> => Promise.resolve(this.chainData[key]),
			set: (key: string, value: Buffer): void => {
				this.chainData[key] = value;
			},
		};
	}
}
