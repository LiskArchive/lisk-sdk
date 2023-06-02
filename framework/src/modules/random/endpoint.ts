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
import { NotFoundError } from '@liskhq/lisk-db';
import { ModuleEndpointContext } from '../../types';
import { BaseEndpoint } from '../base_endpoint';
import { ADDRESS_LENGTH, EMPTY_KEY, MAX_HASH_COMPUTATION } from './constants';
import {
	GetSeedsResponse,
	GetHashOnionUsageRequest,
	addressSchema,
	GetHashOnionUsageResponse,
	HasHashOnionRequest,
	HasHashOnionResponse,
	isSeedRevealValidRequestSchema,
	SetHashOnionRequest,
	hashOnionSchema,
	SetHashOnionUsageRequest,
	setHashOnionUsageRequest,
} from './schemas';
import { ValidatorRevealsStore } from './stores/validator_reveals';
import { getSeedRevealValidity } from './utils';
import { HashOnionStore } from './stores/hash_onion';
import { UsedHashOnionStoreObject, UsedHashOnionsStore } from './stores/used_hash_onions';

export class RandomEndpoint extends BaseEndpoint {
	public async isSeedRevealValid(ctx: ModuleEndpointContext): Promise<{ valid: boolean }> {
		validator.validate<{ generatorAddress: string; seedReveal: string }>(
			isSeedRevealValidRequestSchema,
			ctx.params,
		);

		const { generatorAddress, seedReveal } = ctx.params;
		const randomDataStore = this.stores.get(ValidatorRevealsStore);
		const { validatorReveals } = await randomDataStore.get(ctx, EMPTY_KEY);

		return {
			valid: getSeedRevealValidity(
				cryptography.address.getAddressFromLisk32Address(generatorAddress),
				Buffer.from(seedReveal, 'hex'),
				validatorReveals,
			),
		};
	}

	public async setHashOnion(ctx: ModuleEndpointContext): Promise<void> {
		validator.validate<SetHashOnionRequest>(hashOnionSchema, ctx.params);

		const address = cryptography.address.getAddressFromLisk32Address(ctx.params.address);
		const seed = ctx.params.seed
			? Buffer.from(ctx.params.seed, 'hex')
			: cryptography.utils.generateHashOnionSeed();
		const count = ctx.params.count ?? MAX_HASH_COMPUTATION;
		const distance = ctx.params.distance ?? 1000;

		if (count % distance !== 0) {
			throw new Error('Invalid count. Count must be multiple of distance.');
		}

		let hashes: Buffer[];
		if (ctx.params.hashes) {
			// when hashes is provided, count and distance must be provided together
			if (!ctx.params.count || !ctx.params.distance) {
				throw new Error('Hashes must be provided with count and distance.');
			}

			const expectedLength = count / distance + 1;
			if (ctx.params.hashes.length !== expectedLength) {
				throw new Error(`Invalid length of hashes. hashes must have ${expectedLength} elements.`);
			}
			hashes = ctx.params.hashes.map(h => Buffer.from(h, 'hex'));
		} else {
			if (count > MAX_HASH_COMPUTATION) {
				throw new Error(
					`Count is too big. In order to set count greater than ${MAX_HASH_COMPUTATION}, please compute locally and request with "hashes".`,
				);
			}
			hashes = cryptography.utils.hashOnion(seed, count, distance) as Buffer[];
		}

		const hashOnion = { count, distance, hashes };

		const hashOnionStore = this.offchainStores.get(HashOnionStore);
		await hashOnionStore.set(ctx, address, hashOnion);

		const usedHashOnionStore = this.offchainStores.get(UsedHashOnionsStore);
		await usedHashOnionStore.set(ctx, address, { usedHashOnions: [{ count: 0, height: 0 }] });
	}

	public async getHashOnionSeeds(ctx: ModuleEndpointContext): Promise<GetSeedsResponse> {
		const hashOnionStore = this.offchainStores.get(HashOnionStore);
		const hashOnions = await hashOnionStore.iterate(ctx, {
			gte: Buffer.alloc(ADDRESS_LENGTH, 0),
			lte: Buffer.alloc(ADDRESS_LENGTH, 255),
		});

		const seeds = hashOnions.map(({ key, value }) => ({
			address: cryptography.address.getLisk32AddressFromAddress(key),
			seed: value.hashes[value.hashes.length - 1].toString('hex'),
			count: value.count,
			distance: value.distance,
		}));

		return { seeds };
	}

	public async hasHashOnion(ctx: ModuleEndpointContext): Promise<HasHashOnionResponse> {
		validator.validate<HasHashOnionRequest>(addressSchema, ctx.params);

		const address = cryptography.address.getAddressFromLisk32Address(ctx.params.address);
		const hashOnionStore = this.offchainStores.get(HashOnionStore);
		const hasSeed = await hashOnionStore.has(ctx, address);

		if (!hasSeed) {
			return {
				hasSeed: false,
				remaining: 0,
			};
		}

		const hashOnion = await hashOnionStore.get(ctx, address);
		const usedHashOnionStore = this.offchainStores.get(UsedHashOnionsStore);
		const usedHashOnion = await usedHashOnionStore.getLatest(ctx, address);

		if (!usedHashOnion) {
			return {
				hasSeed: true,
				remaining: hashOnion.count,
			};
		}

		if (usedHashOnion.count === hashOnion.count) {
			return {
				hasSeed: false,
				remaining: 0,
			};
		}

		const remaining = hashOnion.count - usedHashOnion.count;

		return {
			hasSeed: true,
			remaining,
		};
	}

	public async getHashOnionUsage(ctx: ModuleEndpointContext): Promise<GetHashOnionUsageResponse> {
		validator.validate<GetHashOnionUsageRequest>(addressSchema, ctx.params);

		const address = cryptography.address.getAddressFromLisk32Address(ctx.params.address);
		const hashOnionStore = this.offchainStores.get(HashOnionStore);
		const hashOnion = await hashOnionStore.get(ctx, address);
		const seed = hashOnion.hashes[hashOnion.hashes.length - 1].toString('hex');

		const usedHashOnionStore = this.offchainStores.get(UsedHashOnionsStore);

		let usedHashOnion: UsedHashOnionStoreObject;
		try {
			usedHashOnion = await usedHashOnionStore.get(ctx, address);
		} catch (error) {
			if (error instanceof NotFoundError) {
				return {
					usedHashOnions: [{ count: 0, height: 0 }],
					seed,
				};
			}
			throw error;
		}

		return { usedHashOnions: usedHashOnion.usedHashOnions, seed };
	}

	public async setHashOnionUsage(ctx: ModuleEndpointContext): Promise<void> {
		validator.validate<SetHashOnionUsageRequest>(setHashOnionUsageRequest, ctx.params);

		const { address, usedHashOnions } = ctx.params;
		const generatorAddress = cryptography.address.getAddressFromLisk32Address(address);

		const usedHashOnionStore = this.offchainStores.get(UsedHashOnionsStore);
		await usedHashOnionStore.set(ctx, generatorAddress, { usedHashOnions });
	}
}
