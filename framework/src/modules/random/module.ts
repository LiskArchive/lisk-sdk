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

import { utils } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { objects } from '@liskhq/lisk-utils';
import { validator } from '@liskhq/lisk-validator';
import {
	BlockAfterExecuteContext,
	BlockVerifyContext,
	GenesisBlockExecuteContext,
	InsertAssetContext,
	NotFoundError,
} from '../../state_machine';
import { BaseModule, ModuleInitArgs, ModuleMetadata } from '../base_module';
import { RandomMethod } from './method';
import { defaultConfig, EMPTY_KEY } from './constants';
import { RandomEndpoint } from './endpoint';
import {
	blockHeaderAssetRandomModule,
	addressSchema,
	isSeedRevealValidRequestSchema,
	isSeedRevealValidResponseSchema,
	randomModuleConfig,
	hashOnionSchema,
	hasHashOnionResponseSchema,
	getHashOnionUsageResponse,
} from './schemas';
import { BlockHeaderAssetRandomModule } from './types';
import { UsedHashOnion, UsedHashOnionsStore } from './stores/used_hash_onions';
import { Logger } from '../../logger';
import { isSeedValidInput } from './utils';
import { ValidatorRevealsStore } from './stores/validator_reveals';
import { HashOnion, HashOnionStore } from './stores/hash_onion';

export class RandomModule extends BaseModule {
	public method = new RandomMethod(this.stores, this.events, this.name);
	public endpoint = new RandomEndpoint(this.stores, this.offchainStores);

	private _maxLengthReveals!: number;

	public constructor() {
		super();
		this.stores.register(ValidatorRevealsStore, new ValidatorRevealsStore(this.name, 0));
		this.offchainStores.register(HashOnionStore, new HashOnionStore(this.name));
		this.offchainStores.register(UsedHashOnionsStore, new UsedHashOnionsStore(this.name));
	}

	public metadata(): ModuleMetadata {
		return {
			...this.baseMetadata(),
			endpoints: [
				{
					name: this.endpoint.isSeedRevealValid.name,
					request: isSeedRevealValidRequestSchema,
					response: isSeedRevealValidResponseSchema,
				},
				{
					name: this.endpoint.setHashOnion.name,
					request: hashOnionSchema,
				},
				{
					name: this.endpoint.getHashOnionSeeds.name,
					response: hashOnionSchema,
				},
				{
					name: this.endpoint.hasHashOnion.name,
					request: addressSchema,
					response: hasHashOnionResponseSchema,
				},
				{
					name: this.endpoint.getHashOnionUsage.name,
					request: addressSchema,
					response: getHashOnionUsageResponse,
				},
			],
			assets: [
				{
					version: 2,
					data: blockHeaderAssetRandomModule,
				},
			],
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(args: ModuleInitArgs): Promise<void> {
		const { moduleConfig } = args;
		const config = objects.mergeDeep({}, defaultConfig, moduleConfig);
		validator.validate<{ maxLengthReveals: number }>(randomModuleConfig, config);

		this._maxLengthReveals = config.maxLengthReveals;
	}

	public async insertAssets(context: InsertAssetContext): Promise<void> {
		const generatorSubStore = this.offchainStores.get(UsedHashOnionsStore);
		// Get used hash onions
		let usedHashOnions: UsedHashOnion[] = [];
		try {
			const usedHashOnionsData = await generatorSubStore.get(
				context,
				context.header.generatorAddress,
			);
			usedHashOnions = usedHashOnionsData.usedHashOnions;
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
		}
		// Get next hash onion
		const nextHashOnion = await this._getNextHashOnion(
			usedHashOnions,
			context.header.generatorAddress,
			context.header.height,
			context.logger,
			context,
		);

		const nextUsedHashOnion = {
			count: nextHashOnion.count,
			height: context.header.height, // Height of block being forged
		} as UsedHashOnion;

		// Set value in Block Asset
		context.assets.setAsset(
			this.name,
			codec.encode(blockHeaderAssetRandomModule, { seedReveal: nextHashOnion.hash }),
		);

		await generatorSubStore.setLatest(
			context,
			context.getFinalizedHeight(),
			context.header.generatorAddress,
			nextUsedHashOnion,
			usedHashOnions,
		);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verifyAssets(context: BlockVerifyContext): Promise<void> {
		const encodedAsset = context.assets.getAsset(this.name);
		if (!encodedAsset) {
			throw new Error('Random module asset must exist.');
		}
		const asset = codec.decode<BlockHeaderAssetRandomModule>(
			blockHeaderAssetRandomModule,
			encodedAsset,
		);
		validator.validate(blockHeaderAssetRandomModule, asset);
	}

	public async initGenesisState(context: GenesisBlockExecuteContext): Promise<void> {
		const randomDataStore = this.stores.get(ValidatorRevealsStore);
		await randomDataStore.set(context, EMPTY_KEY, { validatorReveals: [] });
	}

	public async afterTransactionsExecute(context: BlockAfterExecuteContext): Promise<void> {
		const encodedAsset = context.assets.getAsset(this.name);
		if (!encodedAsset) {
			throw new Error('Random module asset must exist.');
		}
		const asset = codec.decode<BlockHeaderAssetRandomModule>(
			blockHeaderAssetRandomModule,
			encodedAsset,
		);
		const randomDataStore = this.stores.get(ValidatorRevealsStore);
		const { validatorReveals } = await randomDataStore.get(context, EMPTY_KEY);
		const valid = isSeedValidInput(
			context.header.generatorAddress,
			asset.seedReveal,
			validatorReveals,
		);
		const nextReveals =
			validatorReveals.length === this._maxLengthReveals
				? validatorReveals.slice(1)
				: validatorReveals;

		nextReveals.push({
			seedReveal: asset.seedReveal,
			generatorAddress: context.header.generatorAddress,
			height: context.header.height,
			valid,
		});
		await randomDataStore.set(context, EMPTY_KEY, { validatorReveals: nextReveals });
	}

	private async _getNextHashOnion(
		usedHashOnions: UsedHashOnion[],
		address: Buffer,
		height: number,
		logger: Logger,
		context: InsertAssetContext,
	): Promise<{
		readonly count: number;
		readonly hash: Buffer;
	}> {
		// Get highest hashonion that is used by this address below height
		const usedHashOnion = usedHashOnions.reduce<UsedHashOnion | undefined>((prev, current) => {
			if (
				current.height < height &&
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				(!prev || prev.height < current.height)
			) {
				return current;
			}
			return prev;
		}, undefined);

		const hashOnion = await this._getHashOnion(context, address);
		if (!hashOnion) {
			return {
				hash: utils.generateHashOnionSeed(),
				count: 0,
			};
		}

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (!usedHashOnion) {
			return {
				hash: hashOnion.hashes[0],
				count: 0,
			};
		}
		const { count: usedCount } = usedHashOnion;
		const nextCount = usedCount + 1;
		if (nextCount > hashOnion.count) {
			logger.warn(
				'All of the hash onion has been used already. Please update to the new hash onion.',
			);
			return {
				hash: utils.generateHashOnionSeed(),
				count: 0,
			};
		}
		// If checkpoint is reached then increment the nextCheckpointIndex taking integer into account
		const nextCheckpointIndex =
			nextCount % hashOnion.distance === 0
				? Math.ceil(nextCount / hashOnion.distance) + 1
				: Math.ceil(nextCount / hashOnion.distance);
		const nextCheckpoint = hashOnion.hashes[nextCheckpointIndex];
		const hashes = utils.hashOnion(nextCheckpoint, hashOnion.distance, 1);
		const checkpointIndex = nextCount % hashOnion.distance;
		return {
			hash: hashes[checkpointIndex],
			count: nextCount,
		};
	}

	// return hashonion from DB
	private async _getHashOnion(
		context: InsertAssetContext,
		address: Buffer,
	): Promise<HashOnion | undefined> {
		const hashOnionStore = this.offchainStores.get(HashOnionStore);
		try {
			// await is required to catch the error below
			return await hashOnionStore.get(context, address);
		} catch (error) {
			if (error instanceof NotFoundError) {
				return undefined;
			}
			throw error;
		}
	}
}
