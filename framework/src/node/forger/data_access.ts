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

import { BlockHeader } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import { Database, NotFoundError } from '@liskhq/lisk-db';
import { dataStructures } from '@liskhq/lisk-utils';
import {
	DB_KEY_FORGER_PREVIOUSLY_FORGED,
	DB_KEY_FORGER_REGISTERED_HASH_ONION_SEEDS,
	DB_KEY_FORGER_USED_HASH_ONION,
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

export const previouslyForgedInfoSchema = {
	title: 'Previously Forged Info',
	$id: '/node/forger/previously_forged_info',
	type: 'object',
	required: ['previouslyForgedInfo'],
	properties: {
		previouslyForgedInfo: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['generatorAddress', 'height', 'maxHeightPrevoted', 'maxHeightPreviouslyForged'],
				properties: {
					generatorAddress: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					height: {
						dataType: 'uint32',
						fieldNumber: 2,
					},
					maxHeightPrevoted: {
						dataType: 'uint32',
						fieldNumber: 3,
					},
					maxHeightPreviouslyForged: {
						dataType: 'uint32',
						fieldNumber: 4,
					},
				},
			},
		},
	},
};

codec.addSchema(registeredHashOnionsStoreSchema);

codec.addSchema(usedHashOnionsStoreSchema);

codec.addSchema(previouslyForgedInfoSchema);

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

export interface ForgedInfoWithAddress extends ForgedInfo {
	generatorAddress: Buffer;
}

export interface PreviouslyForgedInfoStoreObject {
	previouslyForgedInfo: ForgedInfoWithAddress[];
}

export const getRegisteredHashOnionSeeds = async (
	db: Database,
): Promise<dataStructures.BufferMap<Buffer>> => {
	try {
		const registeredHashes = codec.decode<RegisteredHashOnionStoreObject>(
			registeredHashOnionsStoreSchema,
			await db.get(Buffer.from(DB_KEY_FORGER_REGISTERED_HASH_ONION_SEEDS)),
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
	db: Database,
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

	await db.set(Buffer.from(DB_KEY_FORGER_REGISTERED_HASH_ONION_SEEDS), registeredHashOnionSeedsBuffer);
};

export const getUsedHashOnions = async (db: Database): Promise<UsedHashOnion[]> => {
	try {
		return codec.decode<UsedHashOnionStoreObject>(
			usedHashOnionsStoreSchema,
			await db.get(Buffer.from(DB_KEY_FORGER_USED_HASH_ONION)),
		).usedHashOnions;
	} catch (error) {
		return [];
	}
};

export const setUsedHashOnions = async (
	db: Database,
	usedHashOnions: UsedHashOnion[],
): Promise<void> => {
	const usedHashOnionObject: UsedHashOnionStoreObject = { usedHashOnions };

	await db.set(
		Buffer.from(DB_KEY_FORGER_USED_HASH_ONION),
		codec.encode(usedHashOnionsStoreSchema, usedHashOnionObject),
	);
};

export const getPreviouslyForgedMap = async (
	db: Database,
): Promise<dataStructures.BufferMap<ForgedInfo>> => {
	try {
		const previouslyForgedBuffer = await db.get(Buffer.from(DB_KEY_FORGER_PREVIOUSLY_FORGED));
		const parsedMap = codec.decode<PreviouslyForgedInfoStoreObject>(
			previouslyForgedInfoSchema,
			previouslyForgedBuffer,
		);
		const result = new dataStructures.BufferMap<ForgedInfo>();
		for (const object of parsedMap.previouslyForgedInfo) {
			const { generatorAddress, ...forgedInfo } = object;
			result.set(generatorAddress, forgedInfo);
		}
		return result;
	} catch (error) {
		if (!(error instanceof NotFoundError)) {
			throw error;
		}
		return new dataStructures.BufferMap<ForgedInfo>();
	}
};

export const setPreviouslyForgedMap = async (
	db: Database,
	previouslyForgedMap: dataStructures.BufferMap<ForgedInfo>,
): Promise<void> => {
	const previouslyForgedStoreObject: PreviouslyForgedInfoStoreObject = { previouslyForgedInfo: [] };
	for (const [key, value] of previouslyForgedMap.entries()) {
		previouslyForgedStoreObject.previouslyForgedInfo.push({ generatorAddress: key, ...value });
	}

	previouslyForgedStoreObject.previouslyForgedInfo.sort((a, b) =>
		a.generatorAddress.compare(b.generatorAddress),
	);

	await db.set(
		Buffer.from(DB_KEY_FORGER_PREVIOUSLY_FORGED),
		codec.encode(previouslyForgedInfoSchema, previouslyForgedStoreObject),
	);
};

/**
 * Saving a height which delegate last forged. this needs to be saved before broadcasting
 * so it needs to be outside of the DB transaction
 */
export const saveMaxHeightPreviouslyForged = async (
	db: Database,
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

	await setPreviouslyForgedMap(db, previouslyForgedMap);
};
