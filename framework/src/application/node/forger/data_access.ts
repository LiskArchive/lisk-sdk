/*
 * Copyright © 2020 Lisk Foundation
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

import { KVStore, NotFoundError } from '@liskhq/lisk-db';
import { codec } from '@liskhq/lisk-codec';
import { dataStructures } from '@liskhq/lisk-utils';
import { BlockHeader } from '@liskhq/lisk-chain';
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import {
	DB_KEY_FORGER_USED_HASH_ONION,
	DB_KEY_FORGER_REGISTERED_HASH_ONION_SEEDS,
	DB_KEY_FORGER_PREVIOUSLY_FORGED,
} from './constant';

export const registeredHashOnionsStoreSchema = {
	title: 'Used hash onion',
	$id: '/node/forger/registered_hash_onion',
	type: 'object',
	required: ['registeredHashOnions'],
	properties: {
		registeredHashOnions: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['address', 'seedHash'],
				properties: {
					address: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					seedHash: {
						dataType: 'bytes',
						fieldNumber: 2,
					},
				},
			},
		},
	},
};

export const usedHashOnionsStoreSchema = {
	title: 'Used hash onion',
	$id: '/node/forger/used_hash_onion',
	type: 'object',
	required: ['usedHashOnions'],
	properties: {
		usedHashOnions: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['address', 'count', 'height'],
				properties: {
					address: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					count: {
						dataType: 'uint32',
						fieldNumber: 2,
					},
					height: {
						dataType: 'uint32',
						fieldNumber: 3,
					},
				},
			},
		},
	},
};

codec.addSchema(registeredHashOnionsStoreSchema);

codec.addSchema(usedHashOnionsStoreSchema);

export interface RegisteredHash {
	[key: string]: Buffer;
}

export interface RegisteredHashOnionStoreObject {
	readonly registeredHashOnions: RegisteredHashOnion[];
}
export interface RegisteredHashOnion {
	readonly address: Buffer;
	readonly seedHash: Buffer;
}

export interface UsedHashOnionStoreObject {
	readonly usedHashOnions: UsedHashOnion[];
}

export interface UsedHashOnion {
	readonly count: number;
	readonly address: Buffer;
	readonly height: number;
}

export interface ForgedInfo {
	height: number;
	maxHeightPrevoted: number;
	maxHeightPreviouslyForged: number;
}

export const getRegisteredHashOnionSeeds = async (
	db: KVStore,
): Promise<dataStructures.BufferMap<Buffer>> => {
	try {
		const registeredHashes = codec.decode<RegisteredHashOnionStoreObject>(
			registeredHashOnionsStoreSchema,
			await db.get(DB_KEY_FORGER_REGISTERED_HASH_ONION_SEEDS),
		);

		const result = new dataStructures.BufferMap<Buffer>();
		for (const registeredHash of registeredHashes.registeredHashOnions) {
			result.set(registeredHash.address, registeredHash.seedHash);
		}

		return result;
	} catch (error) {
		return new dataStructures.BufferMap<Buffer>();
	}
};

export const setRegisteredHashOnionSeeds = async (
	db: KVStore,
	registeredHashOnionSeeds: dataStructures.BufferMap<Buffer>,
): Promise<void> => {
	const savingData: RegisteredHashOnionStoreObject = {
		registeredHashOnions: [],
	};

	for (const [address, seedHash] of registeredHashOnionSeeds.entries()) {
		savingData.registeredHashOnions.push({
			address,
			seedHash,
		});
	}
	const registeredHashOnionSeedsBuffer = codec.encode(registeredHashOnionsStoreSchema, savingData);

	await db.put(DB_KEY_FORGER_REGISTERED_HASH_ONION_SEEDS, registeredHashOnionSeedsBuffer);
};

export const getUsedHashOnions = async (db: KVStore): Promise<UsedHashOnion[]> => {
	try {
		return codec.decode<UsedHashOnionStoreObject>(
			usedHashOnionsStoreSchema,
			await db.get(DB_KEY_FORGER_USED_HASH_ONION),
		).usedHashOnions;
	} catch (error) {
		return [];
	}
};

export const setUsedHashOnions = async (
	db: KVStore,
	usedHashOnions: UsedHashOnion[],
): Promise<void> => {
	const usedHashOnionObject: UsedHashOnionStoreObject = { usedHashOnions };

	await db.put(
		DB_KEY_FORGER_USED_HASH_ONION,
		codec.encode(usedHashOnionsStoreSchema, usedHashOnionObject),
	);
};

export const getPreviouslyForgedMap = async (
	db: KVStore,
): Promise<dataStructures.BufferMap<ForgedInfo>> => {
	try {
		const previouslyForgedBuffer = await db.get(DB_KEY_FORGER_PREVIOUSLY_FORGED);
		const parsedMap = JSON.parse(previouslyForgedBuffer.toString('utf8')) as {
			[address: string]: ForgedInfo;
		};
		const result = new dataStructures.BufferMap<ForgedInfo>();
		for (const address of Object.keys(parsedMap)) {
			result.set(Buffer.from(address, 'binary'), parsedMap[address]);
		}
		return result;
	} catch (error) {
		if (!(error instanceof NotFoundError)) {
			throw error;
		}
		return new dataStructures.BufferMap<ForgedInfo>();
	}
};

/**
 * Saving a height which delegate last forged. this needs to be saved before broadcasting
 * so it needs to be outside of the DB transaction
 */
export const saveMaxHeightPreviouslyForged = async (
	db: KVStore,
	header: BlockHeader,
	previouslyForgedMap: dataStructures.BufferMap<ForgedInfo>,
): Promise<void> => {
	const generatorAddress = getAddressFromPublicKey(header.generatorPublicKey);
	// In order to compare with the minimum height in case of the first block, here it should be 0
	const previouslyForged = previouslyForgedMap.get(generatorAddress);
	const previouslyForgedHeightByDelegate = previouslyForged?.height ?? 0;
	// previously forged height only saves maximum forged height
	if (header.height <= previouslyForgedHeightByDelegate) {
		return;
	}
	previouslyForgedMap.set(generatorAddress, {
		height: header.height,
		maxHeightPrevoted: header.asset.maxHeightPrevoted,
		maxHeightPreviouslyForged: header.asset.maxHeightPreviouslyForged,
	});

	const parsedPreviouslyForgedMap: { [key: string]: ForgedInfo } = {};
	for (const [key, value] of previouslyForgedMap.entries()) {
		parsedPreviouslyForgedMap[key.toString('binary')] = value;
	}

	const previouslyForgedStr = JSON.stringify(parsedPreviouslyForgedMap);
	await db.put(DB_KEY_FORGER_PREVIOUSLY_FORGED, Buffer.from(previouslyForgedStr, 'utf8'));
};
