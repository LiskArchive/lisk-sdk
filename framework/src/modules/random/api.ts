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

import { codec } from '@liskhq/lisk-codec';
import { BlockAssets, ImmutableAPIContext } from '../../state_machine';
import { BaseAPI } from '../base_api';
import { EMPTY_KEY } from '../validators/constants';
import { STORE_PREFIX_RANDOM } from './constants';
import { seedRevealSchema, blockHeaderAssetRandomModule } from './schemas';
import { BlockHeaderAssetRandomModule, ValidatorReveals } from './types';
import { getSeedRevealValidity, getRandomSeed } from './utils';

export class RandomAPI extends BaseAPI {
	public async isSeedRevealValid(
		apiContext: ImmutableAPIContext,
		generatorAddress: Buffer,
		blockAssets: BlockAssets,
	): Promise<boolean> {
		const randomDataStore = apiContext.getStore(this.moduleID, STORE_PREFIX_RANDOM);
		const { validatorReveals } = await randomDataStore.getWithSchema<ValidatorReveals>(
			EMPTY_KEY,
			seedRevealSchema,
		);
		const asset = blockAssets.getAsset(this.moduleID);
		if (!asset) {
			throw new Error('Block asset is missing.');
		}

		const { seedReveal } = codec.decode<BlockHeaderAssetRandomModule>(
			blockHeaderAssetRandomModule,
			asset,
		);

		return getSeedRevealValidity(generatorAddress, seedReveal, validatorReveals);
	}

	public async getRandomBytes(
		apiContext: ImmutableAPIContext,
		height: number,
		numberOfSeeds: number,
	): Promise<Buffer> {
		const randomDataStore = apiContext.getStore(this.moduleID, STORE_PREFIX_RANDOM);
		const { validatorReveals } = await randomDataStore.getWithSchema<ValidatorReveals>(
			EMPTY_KEY,
			seedRevealSchema,
		);

		return getRandomSeed(height, numberOfSeeds, validatorReveals);
	}
}
