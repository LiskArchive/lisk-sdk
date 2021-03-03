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
import { BlockHeader, Account, StateStore, AccountDefaultProps } from '@liskhq/lisk-chain';
import { createFakeDefaultAccount } from './account';

export interface ChainState {
	readonly lastBlockHeaders: BlockHeader[];
	readonly lastBlockReward: bigint;
	readonly networkIdentifier: Buffer;
	get(key: string): Promise<Buffer | undefined>;
	set(key: string, value: Buffer): void;
}

export const defaultNetworkIdentifier =
	'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255';

export interface AdditionalInfo {
	readonly networkIdentifier?: string;
	readonly lastBlockHeaders?: BlockHeader[];
	readonly lastBlockReward?: bigint;
	readonly chainData?: { [key: string]: Buffer };
}

export class StateStoreMock {
	readonly account: Pick<StateStore['account'], 'get' | 'getOrDefault' | 'set'>;
	readonly chain: Pick<
		StateStore['chain'],
		'lastBlockHeaders' | 'lastBlockReward' | 'networkIdentifier' | 'get' | 'set'
	>;

	public accountData: Account[];
	public chainData: { [key: string]: Buffer };

	constructor(initialAccount?: Account[], additionalInfo?: AdditionalInfo) {
		// Make sure to be deep copy
		this.accountData = initialAccount ? initialAccount.map(a => ({ ...a })) : [];
		this.chainData = additionalInfo?.chainData ?? {};

		this.account = {
			// eslint-disable-next-line @typescript-eslint/require-await
			get: async <T = AccountDefaultProps>(address: Buffer): Promise<Account<T>> => {
				const account = this.accountData.find(acc => acc.address.equals(address));
				if (!account) {
					throw new Error('Account not defined');
				}
				return ({ ...account } as unknown) as Account<T>;
			},
			// eslint-disable-next-line @typescript-eslint/require-await
			getOrDefault: async <T = AccountDefaultProps>(address: Buffer): Promise<Account<T>> => {
				const account = this.accountData.find(acc => acc.address.equals(address));
				if (!account) {
					return ({ ...createFakeDefaultAccount({}), address } as unknown) as Account<T>;
				}
				return ({ ...account } as unknown) as Account<T>;
			},
			// eslint-disable-next-line @typescript-eslint/require-await
			set: async (address: Buffer, account: Account): Promise<void> => {
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
			lastBlockHeaders: additionalInfo?.lastBlockHeaders ?? ([] as BlockHeader[]),
			lastBlockReward: additionalInfo?.lastBlockReward ?? BigInt(0),
			get: async (key: string): Promise<Buffer | undefined> => Promise.resolve(this.chainData[key]),
			// eslint-disable-next-line @typescript-eslint/require-await
			set: async (key: string, value: Buffer): Promise<void> => {
				this.chainData[key] = value;
			},
		};
	}
}
