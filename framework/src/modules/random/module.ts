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
import { dataStructures, objects } from '@liskhq/lisk-utils';
import { LiskValidationError, validator } from '@liskhq/lisk-validator';
import { BlockGenerateContext } from '../../node/generator';
import {
	BlockAfterExecuteContext,
	BlockVerifyContext,
	GenesisBlockExecuteContext,
} from '../../node/state_machine';
import { BaseModule, ModuleInitArgs } from '../base_module';
import { RandomAPI } from './api';
import {
	defaultConfig,
	EMPTY_KEY,
	MODULE_ID_RANDOM,
	SEED_REVEAL_HASH_SIZE,
	STORE_PREFIX_RANDOM,
	STORE_PREFIX_USED_HASH_ONION,
} from './constants';
import { RandomEndpoint } from './endpoint';
import {
	blockHeaderAssetRandomModule,
	randomModuleConfig,
	randomModuleGeneratorConfig,
	seedRevealSchema,
	usedHashOnionsStoreSchema,
} from './schemas';
import {
	BlockHeaderAssetRandomModule,
	HashOnionConfig,
	HashOnion,
	UsedHashOnion,
	UsedHashOnionStoreObject,
	ValidatorReveals,
} from './types';
import { Logger } from '../../logger';
import { isSeedValidInput } from './utils';
import { NotFoundError } from '../../node/generator/errors';
import { JSONObject } from '../../types';

export class RandomModule extends BaseModule {
	public id = MODULE_ID_RANDOM;
	public name = 'random';
	public api = new RandomAPI(this.id);
	public endpoint = new RandomEndpoint(this.id);

	private _generatorConfig: HashOnion[] = [];
	private _maxLengthReveals!: number;

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(args: ModuleInitArgs): Promise<void> {
		const { moduleConfig, generatorConfig } = args;
		const config = objects.mergeDeep({}, defaultConfig, moduleConfig);
		const errors = validator.validate(randomModuleConfig, config);
		if (errors.length) {
			throw new LiskValidationError(errors);
		}
		if (generatorConfig && Object.entries(generatorConfig).length > 0) {
			const generatorErrors = validator.validate(randomModuleGeneratorConfig, generatorConfig);
			if (generatorErrors.length) {
				throw new LiskValidationError(generatorErrors);
			}
			this._generatorConfig = (generatorConfig.hashOnions as JSONObject<HashOnion>[]).map(ho => ({
				...ho,
				address: Buffer.from(ho.address, 'hex'),
				hashOnion: {
					...ho.hashOnion,
					hashes: ho.hashOnion.hashes.map(h => Buffer.from(h, 'hex')),
				},
			}));
		}

		this._maxLengthReveals = config.maxLengthReveals as number;
	}

	public async initBlock(context: BlockGenerateContext): Promise<void> {
		const generatorSubStore = context.getGeneratorStore(this.id);
		// Get used hash onions
		let usedHashOnions: UsedHashOnion[] = [];
		try {
			const usedHashOnionsData = await generatorSubStore.get(STORE_PREFIX_USED_HASH_ONION);

			({ usedHashOnions } = codec.decode<UsedHashOnionStoreObject>(
				usedHashOnionsStoreSchema,
				usedHashOnionsData,
			));
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
		}

		// Get next hash onion
		const nextHashOnion = this._getNextHashOnion(
			usedHashOnions,
			context.header.generatorAddress,
			context.header.height,
			context.logger,
		);
		const index = usedHashOnions.findIndex(
			ho => ho.address.equals(context.header.generatorAddress) && ho.count === nextHashOnion.count,
		);
		const nextUsedHashOnion = {
			count: nextHashOnion.count,
			address: context.header.generatorAddress,
			height: context.header.height, // Height of block being forged
		} as UsedHashOnion;

		if (index > -1) {
			// Overwrite the hash onion if it exists
			usedHashOnions[index] = nextUsedHashOnion;
		} else {
			usedHashOnions.push(nextUsedHashOnion);
		}

		const updatedUsedHashOnion = this._filterUsedHashOnions(
			usedHashOnions,
			context.getFinalizedHeight(),
		);
		// Set value in Block Asset
		context.assets.setAsset(
			this.id,
			codec.encode(blockHeaderAssetRandomModule, { seedReveal: nextHashOnion.hash }),
		);
		// Update used seed reveal
		await generatorSubStore.set(
			STORE_PREFIX_USED_HASH_ONION,
			codec.encode(usedHashOnionsStoreSchema, { usedHashOnions: updatedUsedHashOnion }),
		);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verifyAssets(context: BlockVerifyContext): Promise<void> {
		const encodedAsset = context.assets.getAsset(this.id);
		if (!encodedAsset) {
			throw new Error('Random module asset must exist.');
		}
		const asset = codec.decode<BlockHeaderAssetRandomModule>(
			blockHeaderAssetRandomModule,
			encodedAsset,
		);
		if (asset.seedReveal.length !== SEED_REVEAL_HASH_SIZE) {
			throw new Error(
				`Size of the seed reveal must be ${SEED_REVEAL_HASH_SIZE}, but received ${asset.seedReveal.length}.`,
			);
		}
	}

	public async initGenesisState(context: GenesisBlockExecuteContext): Promise<void> {
		const randomDataStore = context.getStore(this.id, STORE_PREFIX_RANDOM);
		await randomDataStore.setWithSchema(EMPTY_KEY, { validatorReveals: [] }, seedRevealSchema);
	}

	public async afterTransactionsExecute(context: BlockAfterExecuteContext): Promise<void> {
		const encodedAsset = context.assets.getAsset(this.id);
		if (!encodedAsset) {
			throw new Error('Random module asset must exist.');
		}
		const asset = codec.decode<BlockHeaderAssetRandomModule>(
			blockHeaderAssetRandomModule,
			encodedAsset,
		);
		const randomDataStore = context.getStore(this.id, STORE_PREFIX_RANDOM);
		const { validatorReveals } = await randomDataStore.getWithSchema<ValidatorReveals>(
			EMPTY_KEY,
			seedRevealSchema,
		);
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
		await randomDataStore.setWithSchema(
			EMPTY_KEY,
			{ validatorReveals: nextReveals },
			seedRevealSchema,
		);
	}

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
		logger: Logger,
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
		if (!hashOnionConfig) {
			return {
				hash: generateHashOnionSeed(),
				count: 0,
			};
		}
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
			logger.warn(
				'All of the hash onion has been used already. Please update to the new hash onion.',
			);
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

	private _getHashOnionConfig(address: Buffer): HashOnionConfig | undefined {
		const hashOnionConfig = this._generatorConfig.find(d => d.address.equals(address));
		if (!hashOnionConfig?.hashOnion) {
			return undefined;
		}

		return hashOnionConfig.hashOnion;
	}
}
