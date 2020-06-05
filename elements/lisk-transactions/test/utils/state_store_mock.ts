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
import { hexToBuffer, getRandomBytes } from '@liskhq/lisk-cryptography';
import { Account, BlockHeader, AccountAsset } from '../../src/types';
import { AccountState, ChainState } from '../../src/base_transaction';

export const defaultAccount = (
	account?: Partial<Account>,
): Account<AccountAsset> => ({
	address: account?.address ?? getRandomBytes(20),
	publicKey: account?.publicKey ?? Buffer.alloc(0),
	balance: account?.balance ?? BigInt(0),
	nonce: account?.nonce ?? BigInt(0),
	keys: {
		mandatoryKeys: account?.keys?.mandatoryKeys ?? [],
		optionalKeys: account?.keys?.optionalKeys ?? [],
		numberOfSignatures: account?.keys?.numberOfSignatures ?? 0,
	},
	asset: {
		delegate: {
			username: account?.asset?.delegate?.username ?? '',
			pomHeights: account?.asset?.delegate?.pomHeights ?? [],
			consecutiveMissedBlocks:
				account?.asset?.delegate?.consecutiveMissedBlocks ?? 0,
			lastForgedHeight: account?.asset?.delegate?.lastForgedHeight ?? 0,
			isBanned: account?.asset?.delegate?.isBanned ?? false,
			totalVotesReceived:
				account?.asset?.delegate?.totalVotesReceived ?? BigInt(0),
		},
		sentVotes: account?.asset?.sentVotes ?? [],
		unlocking: account?.asset?.unlocking ?? [],
	},
});

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
		this.accountData = initialAccount
			? initialAccount.map(a => ({ ...a }))
			: [];
		this.chainData = additionalInfo?.chainData ?? {};

		this.account = {
			// eslint-disable-next-line @typescript-eslint/require-await
			get: async (address: Buffer): Promise<Account> => {
				const account = this.accountData.find(acc =>
					acc.address.equals(address),
				);
				if (!account) {
					throw new Error('Account not defined');
				}
				return { ...account };
			},
			// eslint-disable-next-line @typescript-eslint/require-await
			getOrDefault: async (address: Buffer): Promise<Account> => {
				const account = this.accountData.find(acc =>
					acc.address.equals(address),
				);
				if (!account) {
					return { ...defaultAccount(), address };
				}
				return { ...account };
			},
			set: (address: Buffer, account: Account): void => {
				const index = this.accountData.findIndex(acc =>
					acc.address.equals(address),
				);
				if (index > -1) {
					this.accountData[index] = account;
					return;
				}
				this.accountData.push(account);
			},
		};

		this.chain = {
			networkIdentifier: hexToBuffer(
				additionalInfo?.networkIdentifier ?? defaultNetworkIdentifier,
			),
			lastBlockHeader: additionalInfo?.lastBlockHeader ?? ({} as BlockHeader),
			lastBlockReward: additionalInfo?.lastBlockReward ?? BigInt(0),
			get: async (key: string): Promise<Buffer | undefined> =>
				Promise.resolve(this.chainData[key]),
			set: (key: string, value: Buffer): void => {
				this.chainData[key] = value;
			},
		};
	}
}
