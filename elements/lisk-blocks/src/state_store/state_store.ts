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

'use strict';

import { Storage, StorageTransaction } from '../types';

import { AccountStore } from './account_store';
import { ChainStateStore } from './chain_state_store';
import { TransactionStore } from './transaction_store';

export class StateStore {
	public readonly account: AccountStore;
	public readonly transaction: TransactionStore;
	public readonly chainState: ChainStateStore;

	public constructor(
		storage: Storage,
		options: { readonly tx?: StorageTransaction } = {},
	) {
		this.account = new AccountStore(storage.entities.Account, options);
		this.transaction = new TransactionStore(
			storage.entities.Transaction,
			options,
		);
		this.chainState = new ChainStateStore(storage.entities.ChainState, options);
	}

	public createSnapshot(): void {
		this.account.createSnapshot();
		this.transaction.createSnapshot();
		this.chainState.createSnapshot();
	}

	public restoreSnapshot(): void {
		this.account.restoreSnapshot();
		this.transaction.restoreSnapshot();
		this.chainState.restoreSnapshot();
	}

	public async finalize(): Promise<void> {
		await Promise.all([this.account.finalize(), this.chainState.finalize()]);
	}
}
