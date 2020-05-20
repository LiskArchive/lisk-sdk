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
import {
	Account,
	TransactionJSON,
	BlockHeader,
} from '../../src/transaction_types';
import { AccountState, ChainState } from '../../src/base_transaction';

export const defaultAccount = {
	publicKey: undefined,
	username: null,
	isDelegate: 0,
	balance: BigInt('0'),
	nonce: BigInt(0),
	missedBlocks: 0,
	producedBlocks: 0,
	fees: BigInt('0'),
	rewards: BigInt('0'),
	asset: {},
	toJSON: (): object => ({}),
	keys: {
		mandatoryKeys: [],
		optionalKeys: [],
		numberOfSignatures: 0,
	},
	totalVotesReceived: BigInt(0),
	votes: [],
	unlocking: [],
	delegate: {
		lastForgedHeight: 0,
		consecutiveMissedBlocks: 0,
		isBanned: false,
		pomHeights: [],
	},
};

export const defaultNetworkIdentifier =
	'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255';

export interface AdditionalInfo {
	readonly networkIdentifier?: string;
	readonly lastBlockHeader?: BlockHeader;
	readonly lastBlockReward?: bigint;
	readonly chainData?: { [key: string]: string };
}

export class StateStoreMock {
	readonly account: AccountState;
	readonly chain: ChainState;

	public accountData: Account[];
	public transactionData: TransactionJSON[];
	public chainData: { [key: string]: string };

	constructor(initialAccount?: Account[], additionalInfo?: AdditionalInfo) {
		// Make sure to be deep copy
		this.accountData = initialAccount
			? initialAccount.map(a => ({ ...a }))
			: [];
		this.transactionData = [];
		this.chainData = additionalInfo?.chainData ?? {};

		this.account = {
			// eslint-disable-next-line @typescript-eslint/require-await
			get: async (address: string): Promise<Account> => {
				const account = this.accountData.find(acc => acc.address === address);
				if (!account) {
					throw new Error('Account not defined');
				}
				return { ...account };
			},
			// eslint-disable-next-line @typescript-eslint/require-await
			getOrDefault: async (address: string): Promise<Account> => {
				const account = this.accountData.find(acc => acc.address === address);
				if (!account) {
					return { ...defaultAccount, address };
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

		this.chain = {
			networkIdentifier:
				additionalInfo?.networkIdentifier ?? defaultNetworkIdentifier,
			lastBlockHeader: additionalInfo?.lastBlockHeader ?? ({} as BlockHeader),
			lastBlockReward: additionalInfo?.lastBlockReward ?? BigInt(0),
			get: async (key: string): Promise<string | undefined> =>
				Promise.resolve(this.chainData[key]),
			set: (key: string, value: string): void => {
				this.chainData[key] = value;
			},
		};
	}
}
