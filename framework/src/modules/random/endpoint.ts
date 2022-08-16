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

import { validator } from '@liskhq/lisk-validator';
import * as cryptography from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { ModuleEndpointContext } from '../../types';
import { BaseEndpoint } from '../base_endpoint';
import { STORE_PREFIX_RANDOM, EMPTY_KEY } from './constants';
import {
	isSeedRevealValidRequestSchema,
	seedRevealSchema,
	setSeedRequest,
	setSeedRequestSchema,
	setSeedSchema,
} from './schemas';
import { ValidatorReveals } from './types';
import { getSeedRevealValidity } from './utils';

export class RandomEndpoint extends BaseEndpoint {
	public async isSeedRevealValid(ctx: ModuleEndpointContext): Promise<{ valid: boolean }> {
		validator.validate(isSeedRevealValidRequestSchema, ctx.params);

		const { generatorAddress, seedReveal } = ctx.params;
		const randomDataStore = ctx.getStore(this.moduleID, STORE_PREFIX_RANDOM);
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

	public async setSeed(ctx: ModuleEndpointContext): Promise<void> {
		validator.validate<setSeedRequest>(setSeedRequestSchema, ctx.params);

		const address = Buffer.from(ctx.params.address, 'hex');
		const seed =
			Buffer.from(ctx.params.seed as string, 'hex') ?? cryptography.utils.generateHashOnionSeed();
		// const count = (ctx.params.count as number) ?? 1000000;
		const countBuf =
			Buffer.from(ctx.params.count as string, 'hex') ?? Buffer.from('1000000', 'hex');
		// console.log({countBuf});
		const count = Number(countBuf.toString('hex'));
		const distance = (ctx.params.distance as number) ?? 1000;

		// console.log({ address, seed, count, distance });

		const hashBuffers = cryptography.utils.hashOnion(seed, count, distance);
		const hashes = hashBuffers.map(buf => buf.toString('hex'));
		const hashOnion = { count, distance, hashes };

		const encodedSeed = codec.encode(setSeedSchema, { hashOnion });

		const randomDataStore = ctx.getOffchainStore(this.moduleID);
		await randomDataStore.setWithSchema(address, { encodedSeed }, setSeedSchema);
	}
}
