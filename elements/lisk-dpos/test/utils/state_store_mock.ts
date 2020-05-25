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
import { Account, BlockHeader } from '../../src/types';

interface AccountStoreMock {
	get: (address: string) => Promise<Account>;
	getUpdated: () => Account[];
	set: (address: string, account: Account) => void;
}

interface ConsensusStateStoreMock {
	get: (address: string) => Promise<Buffer | undefined>;
	set: (key: string, v: Buffer) => void;
	lastBlockHeaders: ReadonlyArray<BlockHeader>;
}
interface ChainStateStoreMock {
	get: (address: string) => Promise<Buffer | undefined>;
	set: (key: string, v: Buffer) => void;
}

interface ConsensusState {
	[key: string]: Buffer;
}

export interface AdditionalInformation {
	readonly lastBlockHeaders?: ReadonlyArray<BlockHeader>;
	readonly chainData?: { [key: string]: Buffer };
}

export class StateStoreMock {
	public account: AccountStoreMock;
	public consensus: ConsensusStateStoreMock;
	public chain: ChainStateStoreMock;

	public accountData: Account[];
	public consensusStateData: ConsensusState;
	public chainData: { [key: string]: Buffer };

	// eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
	constructor(
		initialAccount?: Account[],
		initialState?: ConsensusState,
		additionalInformation?: AdditionalInformation,
	) {
		// Make sure to be deep copy
		this.accountData = initialAccount
			? initialAccount.map(a => ({ ...a }))
			: [];

		this.consensusStateData = initialState ? { ...initialState } : {};
		this.chainData = additionalInformation?.chainData ?? {};

		this.account = {
			// eslint-disable-next-line @typescript-eslint/require-await
			get: async (address: string): Promise<Account> => {
				const account = this.accountData.find(acc => acc.address === address);
				if (!account) {
					throw new Error('Account not defined');
				}
				return { ...account };
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
			// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
			getUpdated: () => this.accountData,
		};
		this.consensus = {
			// eslint-disable-next-line @typescript-eslint/require-await
			get: async (key: string): Promise<Buffer | undefined> => {
				return this.consensusStateData[key];
			},
			set: (key: string, val: Buffer): void => {
				this.consensusStateData[key] = val;
			},
			lastBlockHeaders: additionalInformation?.lastBlockHeaders ?? [],
		};
		this.chain = {
			get: async (key: string): Promise<Buffer | undefined> =>
				Promise.resolve(this.chainData[key]),
			set: (key: string, value: Buffer): void => {
				this.chainData[key] = value;
			},
		};
	}
}
