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
import { EMPTY_KEY } from './constants';
import { isSeedRevealValidRequestSchema } from './schemas';
import { ValidatorRevealsStore } from './stores/validator_reveals';
import { getSeedRevealValidity } from './utils';
import { NotFoundError } from '../../state_machine';

export class RandomEndpoint extends BaseEndpoint {
	public async isSeedRevealValid(ctx: ModuleEndpointContext): Promise<{ valid: boolean }> {
		validator.validate(isSeedRevealValidRequestSchema, ctx.params);

		const { generatorAddress, seedReveal } = ctx.params;
		const randomDataStore = this.stores.get(ValidatorRevealsStore);
		const { validatorReveals } = await randomDataStore.get(ctx, EMPTY_KEY);

		return {
			valid: getSeedRevealValidity(
				Buffer.from(generatorAddress as string, 'hex'),
				Buffer.from(seedReveal as string, 'hex'),
				validatorReveals,
			),
		};
	}

	public async setSeed(ctx: ModuleEndpointContext): Promise<void> {
		validator.validate<SetSeedRequest>(setSeedRequestSchema, ctx.params);

		const address = Buffer.from(ctx.params.address, 'hex');
		const seed = ctx.params.seed
			? Buffer.from(ctx.params.seed, 'hex')
			: cryptography.utils.generateHashOnionSeed();
		const count = ctx.params.count ?? 1000000;
		const distance = ctx.params.distance ?? 1000;

		const hashes = cryptography.utils.hashOnion(seed, count, distance);
		const hashOnion = { count, distance, hashes };
		const randomDataStore = ctx.getOffchainStore(this.moduleID, STORE_PREFIX_RANDOM);
		await randomDataStore.setWithSchema(address, hashOnion, setSeedSchema);
	}

	public async getSeeds(ctx: ModuleEndpointContext): Promise<GetSeedsResponse> {
		validator.validate<SetSeedRequest>(setSeedRequestSchema, ctx.params);

		const address = Buffer.from(ctx.params.address, 'hex');
		const randomDataStore = ctx.getOffchainStore(this.moduleID, STORE_PREFIX_RANDOM);
		const { hashes, count, distance } = await randomDataStore.getWithSchema<{
			count: number;
			distance: number;
			hashes: Buffer[];
		}>(address, setSeedSchema);

		const seeds = hashes.map(hash => ({
			address: address.toString('hex'),
			seed: hash.toString('hex'),
			count,
			distance,
		}));

		return { seeds };
	}

	public async hasSeed(ctx: ModuleEndpointContext): Promise<HasSeedResponse> {
		validator.validate<Address>(hasSeedSchema, ctx.params);

		const address = Buffer.from(ctx.params.address, 'hex');
		const randomDataStore = ctx.getOffchainStore(this.moduleID, STORE_PREFIX_RANDOM);
		const hasSeed = await randomDataStore.has(address);
		const { count } = await randomDataStore.getWithSchema<{
			count: number;
		}>(address, setSeedSchema);
		let usedHashOnions: UsedHashOnion[] = [];

		try {
			const usedHashOnionsData = await randomDataStore.get(STORE_PREFIX_USED_HASH_ONION);
			({ usedHashOnions } = codec.decode<UsedHashOnionStoreObject>(
				usedHashOnionsStoreSchema,
				usedHashOnionsData,
			));
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
		}

		const remaining = count - usedHashOnions.length;

		return { hasSeed, remaining };
	}

	public async getSeedUsage(ctx: ModuleEndpointContext): Promise<GetSeedUsageResponse> {
		validator.validate<Address>(getSeedUsageSchema, ctx.params);

		const address = Buffer.from(ctx.params.address, 'hex');
		const randomDataStore = ctx.getOffchainStore(this.moduleID, STORE_PREFIX_RANDOM);
		// TODO: get hashes from DB
		const { hashes } = await randomDataStore.getWithSchema<{
			hashes: Buffer[];
		}>(address, setSeedSchema);
		// eslint-disable-next-line no-console
		console.log({ hashes });

		// TODO: seed = 1st or last element of hashes is the seed itself

		// TODO: get count and height from RandomModule class

		// TODO: get lastUsedHash

		// FIXME: return correct data
		return { height: 1, count: 1, lastUsedHash: '', seed: '' };
	}
}
