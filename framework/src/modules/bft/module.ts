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
import { LiskValidationError, validator } from '@liskhq/lisk-validator';
import { BaseModule, ModuleInitArgs } from '../base_module';
import { BFTAPI } from './api';
import { BFTEndpoint } from './endpoint';
import {
	EMPTY_KEY,
	MODULE_ID_BFT,
	STORE_PREFIX_BFT_PARAMETERS,
	STORE_PREFIX_BFT_VOTES,
} from './constants';
import { bftModuleConfig, BFTVotes, bftVotesSchema } from './schemas';
import { BlockAfterExecuteContext, GenesisBlockExecuteContext } from '../../node/state_machine';
import { ValidatorsAPI } from './types';
import {
	insertBlockBFTInfo,
	updateMaxHeightCertified,
	updateMaxHeightPrecommitted,
	updateMaxHeightPrevoted,
	updatePrevotesPrecommits,
} from './bft_votes';
import { BFTParametersCache, deleteBFTParameters } from './bft_params';

export class BFTModule extends BaseModule {
	public id = MODULE_ID_BFT;
	public name = 'bft';
	public api = new BFTAPI(this.id);
	public endpoint = new BFTEndpoint(this.id);

	private _batchSize!: number;
	private _maxLengthBlockBFTInfos!: number;

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(args: ModuleInitArgs): Promise<void> {
		const { moduleConfig } = args;
		const errors = validator.validate(bftModuleConfig, moduleConfig);
		if (errors.length) {
			throw new LiskValidationError(errors);
		}
		this._batchSize = moduleConfig.batchSize as number;
		this.api.init(this._batchSize);
		this._maxLengthBlockBFTInfos = 3 * this._batchSize;
	}

	public addDependencies(validatorsAPI: ValidatorsAPI) {
		this.api.addDependencies(validatorsAPI);
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public async afterGenesisBlockExecute(_context: GenesisBlockExecuteContext): Promise<void> {}

	public async afterBlockExecute(context: BlockAfterExecuteContext): Promise<void> {
		const votesStore = context.getStore(this.id, STORE_PREFIX_BFT_VOTES);
		const paramsStore = context.getStore(this.id, STORE_PREFIX_BFT_PARAMETERS);
		const paramsCache = new BFTParametersCache(paramsStore);
		const bftVotes = await votesStore.getWithSchema<BFTVotes>(EMPTY_KEY, bftVotesSchema);

		insertBlockBFTInfo(bftVotes, context.header, this._maxLengthBlockBFTInfos);
		await paramsCache.cache(
			bftVotes.blockBFTInfos[bftVotes.blockBFTInfos.length - 1].height,
			bftVotes.blockBFTInfos[0].height,
		);
		await updatePrevotesPrecommits(bftVotes, paramsCache);
		await updateMaxHeightPrevoted(bftVotes, paramsCache);
		await updateMaxHeightPrecommitted(bftVotes, paramsCache);
		updateMaxHeightCertified(bftVotes, context.header);
		await votesStore.setWithSchema(EMPTY_KEY, bftVotes, bftVotesSchema);
		const minHeightBFTParametersRequired = Math.min(
			bftVotes.blockBFTInfos[bftVotes.blockBFTInfos.length - 1].height,
			bftVotes.maxHeightCertified + 1,
		);
		await deleteBFTParameters(paramsStore, minHeightBFTParametersRequired);
	}
}
