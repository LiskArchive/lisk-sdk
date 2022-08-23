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
import { NamedRegistry } from '../named_registry';
import { EMPTY_KEY } from '../validators/constants';
import { blockHeaderAssetRandomModule } from './schemas';
import { ValidatorRevealsStore } from './stores/validator_reveals';
import { BlockHeaderAssetRandomModule } from './types';
import { getSeedRevealValidity, getRandomSeed } from './utils';

export class RandomAPI extends BaseAPI {
	private readonly _moduleName: string;

	public constructor(stores: NamedRegistry, events: NamedRegistry, moduleName: string) {
		super(stores, events);
		this._moduleName = moduleName;
	}

	public async isSeedRevealValid(
		apiContext: ImmutableAPIContext,
		generatorAddress: Buffer,
		blockAssets: BlockAssets,
	): Promise<boolean> {
		const randomDataStore = this.stores.get(ValidatorRevealsStore);
		const { validatorReveals } = await randomDataStore.get(apiContext, EMPTY_KEY);
		const asset = blockAssets.getAsset(this._moduleName);
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
		const randomDataStore = this.stores.get(ValidatorRevealsStore);
		const { validatorReveals } = await randomDataStore.get(apiContext, EMPTY_KEY);

		return getRandomSeed(height, numberOfSeeds, validatorReveals);
	}
}
