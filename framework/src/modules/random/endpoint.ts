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

import { validator, LiskValidationError } from '@liskhq/lisk-validator';
import { ModuleEndpointContext } from '../..';
import { BaseEndpoint } from '../base_endpoint';
import { STORE_PREFIX_RANDOM, EMPTY_KEY } from './constants';
import { isSeedRevealValidParamsSchema, seedRevealSchema } from './schemas';
import { ValidatorReveals } from './types';
import { getSeedRevealValidity } from './utils';

export class RandomEndpoint extends BaseEndpoint {
	public async isSeedRevealValid(context: ModuleEndpointContext): Promise<{ valid: boolean }> {
		const errors = validator.validate(isSeedRevealValidParamsSchema, context.params);
		if (errors.length > 0) {
			throw new LiskValidationError([...errors]);
		}
		const { generatorAddress, seedReveal } = context.params;
		const randomDataStore = context.getStore(this.moduleID, STORE_PREFIX_RANDOM);
		const { validatorReveals } = await randomDataStore.getWithSchema<ValidatorReveals>(
			EMPTY_KEY,
			seedRevealSchema,
		);

		return {
			valid: getSeedRevealValidity(
				Buffer.from(generatorAddress as string, 'hex'),
				Buffer.from(seedReveal as string, 'hex'),
				validatorReveals,
			),
		};
	}
}
