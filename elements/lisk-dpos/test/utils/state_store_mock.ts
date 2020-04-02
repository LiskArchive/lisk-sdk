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
	get: (address: string) => Promise<string | undefined>;
	set: (key: string, v: string) => void;
	readonly lastBlockHeaders: ReadonlyArray<BlockHeader>;
}

interface ConsensusState {
	[key: string]: string;
}

export interface AdditionalInformation {
	readonly lastBlockHeaders: ReadonlyArray<BlockHeader>;
}

export class StateStoreMock {
	public account: AccountStoreMock;
	public consensus: ConsensusStateStoreMock;

	public accountData: Account[];
	public consensusStateData: ConsensusState;

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

		this.account = {
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
			getUpdated: () => this.accountData,
		};
		this.consensus = {
			get: async (key: string): Promise<string | undefined> => {
				return this.consensusStateData[key];
			},
			set: (key: string, val: string): void => {
				this.consensusStateData[key] = val;
			},
			lastBlockHeaders: additionalInformation?.lastBlockHeaders ?? [],
		};
	}
}
