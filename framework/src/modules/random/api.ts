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

import { ImmutableAPIContext } from '../../node/state_machine';
import { BaseAPI } from '../base_api';
import { EMPTY_KEY } from '../validators/constants';
import { STORE_PREFIX_RANDOM } from './constants';
import { seedRevealSchema } from './schemas';
import { ValidatorReveals } from './types';
import { isSeedRevealValidUtil, randomBytesUtil } from './utils';

export class RandomAPI extends BaseAPI {
	public async isSeedRevealValid(
		apiContext: ImmutableAPIContext,
		generatorAddress: Buffer,
		seedReveal: Buffer,
	): Promise<boolean> {
		const randomDataStore = apiContext.getStore(this.moduleID, STORE_PREFIX_RANDOM);
		const { validatorReveals } = await randomDataStore.getWithSchema<ValidatorReveals>(
			EMPTY_KEY,
			seedRevealSchema,
		);

		return isSeedRevealValidUtil(generatorAddress, seedReveal, validatorReveals);
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

		return randomBytesUtil(height, numberOfSeeds, validatorReveals);
	}
}
