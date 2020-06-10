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

import { codec } from '@liskhq/lisk-codec';
import { BatchChain } from '@liskhq/lisk-db';
import { BlockHeader, StateDiff } from '../types';
import { AccountStore } from './account_store';
import { ChainStateStore } from './chain_state_store';
import { ConsensusStateStore } from './consensus_state_store';
import { DataAccess } from '../data_access';
import { DB_KEY_DIFF_STATE } from '../data_access/constants';
import { stateDiffSchema } from '../schema';

interface AdditionalInformation {
	readonly lastBlockHeaders: ReadonlyArray<BlockHeader>;
	readonly networkIdentifier: Buffer;
	readonly lastBlockReward: bigint;
	readonly defaultAsset: object;
}

export class StateStore {
	public readonly account: AccountStore;
	public readonly chain: ChainStateStore;
	public readonly consensus: ConsensusStateStore;

	public constructor(
		dataAccess: DataAccess,
		additionalInformation: AdditionalInformation,
	) {
		this.account = new AccountStore(dataAccess, {
			defaultAsset: additionalInformation.defaultAsset,
		});
		this.consensus = new ConsensusStateStore(dataAccess, {
			lastBlockHeaders: additionalInformation.lastBlockHeaders,
		});
		this.chain = new ChainStateStore(dataAccess, {
			lastBlockHeader: additionalInformation.lastBlockHeaders[0],
			networkIdentifier: additionalInformation.networkIdentifier,
			lastBlockReward: additionalInformation.lastBlockReward,
		});
	}

	public createSnapshot(): void {
		this.account.createSnapshot();
		this.consensus.createSnapshot();
		this.chain.createSnapshot();
	}

	public restoreSnapshot(): void {
		this.account.restoreSnapshot();
		this.consensus.restoreSnapshot();
		this.chain.restoreSnapshot();
	}

	public finalize(height: string, batch: BatchChain): void {
		const accountStateDiff = this.account.finalize(batch);
		const chainStateDiff = this.chain.finalize(batch);
		const consensusStateDiff = this.consensus.finalize(batch);
		this._saveDiff(
			height,
			[accountStateDiff, chainStateDiff, consensusStateDiff],
			batch,
		);
	}

	// eslint-disable-next-line class-methods-use-this
	private _saveDiff(
		height: string,
		stateDiffs: Array<Readonly<StateDiff>>,
		batch: BatchChain,
	): void {
		const diffToEncode = stateDiffs.reduce(
			(acc, val) => {
				acc.updated.push(...val.updated);
				acc.created.push(...val.created);
				return acc;
			},
			{ updated: [], created: [] },
		);

		const encodedDiff = codec.encode(stateDiffSchema, diffToEncode);
		batch.put(`${DB_KEY_DIFF_STATE}:${height}`, encodedDiff);
	}
}
