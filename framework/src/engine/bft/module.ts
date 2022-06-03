/*
 * Copyright © 2021 Lisk Foundation
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
import { BlockHeader, StateStore } from '@liskhq/lisk-chain';
import { BFTAPI } from './api';
import {
	EMPTY_KEY,
	MODULE_ID_BFT,
	STORE_PREFIX_BFT_PARAMETERS,
	STORE_PREFIX_BFT_VOTES,
	STORE_PREFIX_GENERATOR_KEYS,
} from './constants';
import { BFTVotes, bftVotesSchema } from './schemas';
import {
	insertBlockBFTInfo,
	updateMaxHeightCertified,
	updateMaxHeightPrecommitted,
	updateMaxHeightPrevoted,
	updatePrevotesPrecommits,
} from './bft_votes';
import { BFTParametersCache, deleteBFTParameters } from './bft_params';
import { deleteGeneratorKeys } from './utils';

export class BFTModule {
	public id = MODULE_ID_BFT;
	public name = 'bft';
	public api = new BFTAPI(this.id);

	private _batchSize!: number;
	private _maxLengthBlockBFTInfos!: number;

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(batchSize: number): Promise<void> {
		this._batchSize = batchSize;
		this.api.init(this._batchSize);
		this._maxLengthBlockBFTInfos = 3 * this._batchSize;
	}

	public async initGenesisState(stateStore: StateStore, header: BlockHeader): Promise<void> {
		const votesStore = stateStore.getStore(this.id, STORE_PREFIX_BFT_VOTES);
		await votesStore.setWithSchema(
			EMPTY_KEY,
			{
				maxHeightPrevoted: header.height,
				maxHeightPrecommitted: header.height,
				maxHeightCertified: header.height,
				blockBFTInfos: [],
				activeValidatorsVoteInfo: [],
			},
			bftVotesSchema,
		);
	}

	public async beforeTransactionsExecute(
		stateStore: StateStore,
		header: BlockHeader,
	): Promise<void> {
		const votesStore = stateStore.getStore(this.id, STORE_PREFIX_BFT_VOTES);
		const paramsStore = stateStore.getStore(this.id, STORE_PREFIX_BFT_PARAMETERS);
		const paramsCache = new BFTParametersCache(paramsStore);
		const bftVotes = await votesStore.getWithSchema<BFTVotes>(EMPTY_KEY, bftVotesSchema);

		insertBlockBFTInfo(bftVotes, header, this._maxLengthBlockBFTInfos);
		await paramsCache.cache(
			bftVotes.blockBFTInfos[bftVotes.blockBFTInfos.length - 1].height,
			bftVotes.blockBFTInfos[0].height,
		);
		await updatePrevotesPrecommits(bftVotes, paramsCache);
		await updateMaxHeightPrevoted(bftVotes, paramsCache);
		await updateMaxHeightPrecommitted(bftVotes, paramsCache);
		updateMaxHeightCertified(bftVotes, header);
		await votesStore.setWithSchema(EMPTY_KEY, bftVotes, bftVotesSchema);
		const minHeightBFTParametersRequired = Math.min(
			bftVotes.blockBFTInfos[bftVotes.blockBFTInfos.length - 1].height,
			bftVotes.maxHeightCertified + 1,
		);
		await deleteBFTParameters(paramsStore, minHeightBFTParametersRequired);

		const keysStore = stateStore.getStore(this.id, STORE_PREFIX_GENERATOR_KEYS);
		await deleteGeneratorKeys(keysStore, minHeightBFTParametersRequired);
	}
}
