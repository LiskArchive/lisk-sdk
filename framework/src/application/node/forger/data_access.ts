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

import { KVStore } from '@liskhq/lisk-db';
import { BufferMap } from '@liskhq/lisk-chain';
import {
	DB_KEY_FORGER_USED_HASH_ONION,
	DB_KEY_FORGER_REGISTERED_HASH_ONION_SEEDS,
} from './constant';

export interface RegisteredHash {
	[key: string]: Buffer;
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
): Promise<BufferMap<Buffer>> => {
	try {
		const registeredHashOnionSeedsBuffer = await db.get(
			DB_KEY_FORGER_REGISTERED_HASH_ONION_SEEDS,
		);
		const registeredHash = JSON.parse(
			registeredHashOnionSeedsBuffer.toString('utf8'),
		) as { [key: string]: string };
		const result = new BufferMap<Buffer>();
		for (const key of Object.keys(registeredHash)) {
			result.set(
				Buffer.from(key, 'binary'),
				Buffer.from(registeredHash[key], 'binary'),
			);
		}
		return result;
	} catch (error) {
		return new BufferMap<Buffer>();
	}
};

export const setRegisteredHashOnionSeeds = async (
	db: KVStore,
	registeredHashOnionSeeds: BufferMap<Buffer>,
): Promise<void> => {
	const savingData: { [key: string]: string } = {};
	for (const [key, value] of registeredHashOnionSeeds.entries()) {
		savingData[key.toString('binary')] = value.toString('binary');
	}
	const registeredHashOnionSeedsStr = JSON.stringify(registeredHashOnionSeeds);
	await db.put(
		DB_KEY_FORGER_REGISTERED_HASH_ONION_SEEDS,
		Buffer.from(registeredHashOnionSeedsStr, 'utf8'),
	);
};

export const getUsedHashOnions = async (
	db: KVStore,
): Promise<UsedHashOnion[]> => {
	try {
		const usedHashOnionsBuffer = await db.get(DB_KEY_FORGER_USED_HASH_ONION);

		const usedHashOnionsJSON = JSON.parse(
			usedHashOnionsBuffer.toString('utf8'),
		) as { address: string; count: number; height: number }[];
		const reuslt = [];
		for (const ho of usedHashOnionsJSON) {
			reuslt.push({
				address: Buffer.from(ho.address, 'binary'),
				count: ho.count,
				height: ho.height,
			});
		}
		return reuslt;
	} catch (error) {
		return [];
	}
};

export const setUsedHashOnions = async (
	db: KVStore,
	usedHashOnions: UsedHashOnion[],
): Promise<void> => {
	const decodedUsedHashOnion = [];
	for (const ho of usedHashOnions) {
		decodedUsedHashOnion.push({
			...ho,
			address: ho.address.toString('binary'),
		});
	}
	const usedHashOnionsStr = JSON.stringify(decodedUsedHashOnion);
	await db.put(
		DB_KEY_FORGER_USED_HASH_ONION,
		Buffer.from(usedHashOnionsStr, 'utf8'),
	);
};
