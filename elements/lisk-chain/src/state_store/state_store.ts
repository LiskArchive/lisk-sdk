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

import { BlockHeader, Storage, StorageTransaction } from '../types';

import { AccountStore } from './account_store';
import { ChainStateStore } from './chain_state_store';
import { ConsensusStateStore } from './consensus_state_store';
import { TransactionStore } from './transaction_store';

interface AdditionalInformation {
	readonly lastBlockHeaders: ReadonlyArray<BlockHeader>;
	readonly networkIdentifier: string;
}

export class StateStore {
	public readonly account: AccountStore;
	public readonly transaction: TransactionStore;
	public readonly chain: ChainStateStore;
	public readonly consensus: ConsensusStateStore;

	public constructor(
		storage: Storage,
		additionalInformation: AdditionalInformation,
	) {
		this.account = new AccountStore(storage.entities.Account);
		this.consensus = new ConsensusStateStore(storage.entities.ConsensusState, {
			lastBlockHeaders: additionalInformation.lastBlockHeaders,
		});
		this.chain = new ChainStateStore(storage.entities.ChainState, {
			lastBlockHeader: additionalInformation.lastBlockHeaders[0],
			networkIdentifier: additionalInformation.networkIdentifier,
		});
		this.transaction = new TransactionStore(storage.entities.Transaction);
	}

	public createSnapshot(): void {
		this.account.createSnapshot();
		this.transaction.createSnapshot();
		this.consensus.createSnapshot();
		this.chain.createSnapshot();
	}

	public restoreSnapshot(): void {
		this.account.restoreSnapshot();
		this.transaction.restoreSnapshot();
		this.consensus.restoreSnapshot();
		this.chain.restoreSnapshot();
	}

	public async finalize(tx: StorageTransaction): Promise<void> {
		await Promise.all([
			this.account.finalize(tx),
			this.chain.finalize(tx),
			this.consensus.finalize(tx),
		]);
	}
}
