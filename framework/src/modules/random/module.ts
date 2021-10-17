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

import { hashOnion, generateHashOnionSeed } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { dataStructures } from '@liskhq/lisk-utils';
import { BlockGenerateContext } from '../../node/generator';
import {
	BlockAfterExecuteContext,
	BlockVerifyContext,
	GenesisBlockExecuteContext,
} from '../../node/state_machine';
import { BaseModule, ModuleInitArgs } from '../base_module';
import { RandomAPI } from './api';
import {
	DEFAULT_MAX_LENGTH_REVEALS,
	MODULE_ID_RANDOM,
	STORE_PREFIX_USED_HASH_ONION,
} from './constants';
import { RandomEndpoint } from './endpoint';
import { blockHeaderAssetRandomModule, usedHashOnionsStoreSchema } from './schemas';
import { GeneratorConfig, HashOnionConfig, UsedHashOnion, UsedHashOnionStoreObject } from './types';

export class RandomModule extends BaseModule {
	public id = MODULE_ID_RANDOM;
	public name = 'random';
	public api = new RandomAPI(this.id);
	public endpoint = new RandomEndpoint(this.id);

	private _generatorConfig!: GeneratorConfig;
	private _maxLengthReveals!: number;

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(args: ModuleInitArgs): Promise<void> {
		const { moduleConfig } = args;
		this._generatorConfig = moduleConfig.generatorConfig as GeneratorConfig;
		this._maxLengthReveals =
			(moduleConfig.maxLengthReveals as number) ?? DEFAULT_MAX_LENGTH_REVEALS;
		// eslint-disable-next-line no-console
		console.log(this._generatorConfig, this._maxLengthReveals);
	}

	public async initBlock(context: BlockGenerateContext): Promise<void> {
		const generatorSubStore = context.getGeneratorStore(this.id);
		// Get used hash onions
		const { usedHashOnions } = codec.decode<UsedHashOnionStoreObject>(
			usedHashOnionsStoreSchema,
			await generatorSubStore.get(STORE_PREFIX_USED_HASH_ONION),
		);
		// Get next hash onion
		const nextHashOnion = this._getNextHashOnion(
			usedHashOnions,
			context.header.generatorAddress,
			context.header.height,
		);
		const index = usedHashOnions.findIndex(
			ho => ho.address.equals(context.header.generatorAddress) && ho.count === nextHashOnion.count,
		);
		const nextUsedHashOnion = {
			count: nextHashOnion.count,
			address: context.header.generatorAddress,
			height: 0, // TODO: nextHeight
		} as UsedHashOnion;

		if (index > -1) {
			// Overwrite the hash onion if it exists
			usedHashOnions[index] = nextUsedHashOnion;
		} else {
			usedHashOnions.push(nextUsedHashOnion);
		}

		const updatedUsedHashOnion = this._filterUsedHashOnions(
			usedHashOnions,
			0, // TODO:this._bftModule.finalizedHeight
		);

		// Set value in Block Asset
		context.assets.setAsset(
			this.id,
			codec.encode(blockHeaderAssetRandomModule, { seedReveal: nextHashOnion.hash }),
		);
		// Update used seed reveal
		await generatorSubStore.set(
			STORE_PREFIX_USED_HASH_ONION,
			codec.encode(usedHashOnionsStoreSchema, updatedUsedHashOnion),
		);
	}

	// eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-empty-function
	public async verifyBlock(_context: BlockVerifyContext): Promise<void> {}

	// eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-empty-function
	public async afterGenesisBlockExecute(_context: GenesisBlockExecuteContext): Promise<void> {}

	// eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-empty-function
	public async afterBlockExecute(_context: BlockAfterExecuteContext): Promise<void> {}

	private _filterUsedHashOnions(
		usedHashOnions: UsedHashOnion[],
		finalizedHeight: number,
	): UsedHashOnion[] {
		const filteredObject = usedHashOnions.reduce(
			({ others, highest }, current) => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const prevUsed = highest.get(current.address);
				if (prevUsed === undefined) {
					highest.set(current.address, current);
				} else if (prevUsed.height < current.height) {
					others.push(prevUsed);
					highest.set(current.address, current);
				}
				return {
					highest,
					others,
				};
			},
			{
				others: [] as UsedHashOnion[],
				highest: new dataStructures.BufferMap<UsedHashOnion>(),
			},
		);

		const filtered = filteredObject.others.filter(ho => ho.height > finalizedHeight);
		return filtered.concat(filteredObject.highest.values());
	}

	private _getNextHashOnion(
		usedHashOnions: ReadonlyArray<UsedHashOnion>,
		address: Buffer,
		height: number,
	): {
		readonly count: number;
		readonly hash: Buffer;
	} {
		// Get highest hashonion that is used by this address below height
		const usedHashOnion = usedHashOnions.reduce<UsedHashOnion | undefined>((prev, current) => {
			if (!current.address.equals(address)) {
				return prev;
			}
			if (
				current.height < height &&
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				(!prev || prev.height < current.height)
			) {
				return current;
			}
			return prev;
		}, undefined);
		const hashOnionConfig = this._getHashOnionConfig(address);
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (!usedHashOnion) {
			return {
				hash: hashOnionConfig.hashes[0],
				count: 0,
			};
		}
		const { count: usedCount } = usedHashOnion;
		const nextCount = usedCount + 1;
		if (nextCount > hashOnionConfig.count) {
			// this._logger.warn(
			// 	'All of the hash onion has been used already. Please update to the new hash onion.',
			// );
			return {
				hash: generateHashOnionSeed(),
				count: 0,
			};
		}
		// If checkpoint is reached then increment the nextCheckpointIndex taking integer into account
		const nextCheckpointIndex =
			nextCount % hashOnionConfig.distance === 0
				? Math.ceil(nextCount / hashOnionConfig.distance) + 1
				: Math.ceil(nextCount / hashOnionConfig.distance);
		const nextCheckpoint = hashOnionConfig.hashes[nextCheckpointIndex];
		const hashes = hashOnion(nextCheckpoint, hashOnionConfig.distance, 1);
		const checkpointIndex = nextCount % hashOnionConfig.distance;
		return {
			hash: hashes[checkpointIndex],
			count: nextCount,
		};
	}

	private _getHashOnionConfig(address: Buffer): HashOnionConfig {
		const delegateConfig = this._generatorConfig.delegates?.find(d => d.address.equals(address));
		if (!delegateConfig?.hashOnion) {
			throw new Error(`Account ${address.toString('hex')} does not have hash onion in the config`);
		}

		return delegateConfig.hashOnion;
	}
}
