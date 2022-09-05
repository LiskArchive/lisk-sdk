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
import { dataStructures, objects } from '@liskhq/lisk-utils';
import { validator } from '@liskhq/lisk-validator';
import {
	BlockAfterExecuteContext,
	BlockVerifyContext,
	GenesisBlockExecuteContext,
	InsertAssetContext,
	NotFoundError,
} from '../../state_machine';
import { BaseModule, ModuleInitArgs, ModuleMetadata } from '../base_module';
import { RandomAPI } from './api';
import { defaultConfig, EMPTY_KEY, STORE_PREFIX_USED_HASH_ONION } from './constants';
import { RandomEndpoint } from './endpoint';
import {
	blockHeaderAssetRandomModule,
	isSeedRevealValidRequestSchema,
	isSeedRevealValidResponseSchema,
	randomModuleConfig,
	randomModuleGeneratorConfig,
} from './schemas';
import { BlockHeaderAssetRandomModule, HashOnionConfig, HashOnion, UsedHashOnion } from './types';
import { Logger } from '../../logger';
import { isSeedValidInput } from './utils';
import { JSONObject } from '../../types';
import { ValidatorRevealsStore } from './stores/validator_reveals';
import { UsedHashOnionsStore } from './stores/used_hash_onions';

export class RandomModule extends BaseModule {
	public api = new RandomAPI(this.stores, this.events, this.name);
	public endpoint = new RandomEndpoint(this.stores, this.offchainStores);

	private _generatorConfig: HashOnion[] = [];
	private _maxLengthReveals!: number;

	public constructor() {
		super();
		this.stores.register(ValidatorRevealsStore, new ValidatorRevealsStore(this.name));
		this.offchainStores.register(UsedHashOnionsStore, new UsedHashOnionsStore(this.name));
	}

	public metadata(): ModuleMetadata {
		return {
			endpoints: [
				{
					name: this.endpoint.isSeedRevealValid.name,
					request: isSeedRevealValidRequestSchema,
					response: isSeedRevealValidResponseSchema,
				},
			],
			commands: [],
			events: this.events.values().map(v => ({
				name: v.name,
				data: v.schema,
			})),
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
		const { moduleConfig, generatorConfig } = args;
		const config = objects.mergeDeep({}, defaultConfig, moduleConfig);
		validator.validate(randomModuleConfig, config);

		if (generatorConfig && Object.entries(generatorConfig).length > 0) {
			validator.validate(randomModuleGeneratorConfig, generatorConfig);

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

	public async insertAssets(context: InsertAssetContext): Promise<void> {
		const generatorSubStore = this.offchainStores.get(UsedHashOnionsStore);
		// Get used hash onions
		let usedHashOnions: UsedHashOnion[] = [];
		try {
			const usedHashOnionsData = await generatorSubStore.get(context, STORE_PREFIX_USED_HASH_ONION);
			usedHashOnions = usedHashOnionsData.usedHashOnions;
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
			this.name,
			codec.encode(blockHeaderAssetRandomModule, { seedReveal: nextHashOnion.hash }),
		);
		// Update used seed reveal
		await generatorSubStore.set(context, STORE_PREFIX_USED_HASH_ONION, {
			usedHashOnions: updatedUsedHashOnion,
		});
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
				hash: utils.generateHashOnionSeed(),
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
				hash: utils.generateHashOnionSeed(),
				count: 0,
			};
		}
		// If checkpoint is reached then increment the nextCheckpointIndex taking integer into account
		const nextCheckpointIndex =
			nextCount % hashOnionConfig.distance === 0
				? Math.ceil(nextCount / hashOnionConfig.distance) + 1
				: Math.ceil(nextCount / hashOnionConfig.distance);
		const nextCheckpoint = hashOnionConfig.hashes[nextCheckpointIndex];
		const hashes = utils.hashOnion(nextCheckpoint, hashOnionConfig.distance, 1);
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
