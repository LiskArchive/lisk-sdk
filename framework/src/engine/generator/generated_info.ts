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

import { codec } from '@liskhq/lisk-codec';
import { GENERATOR_STORE_RESERVED_PREFIX_BUFFER } from './constants';
import { NotFoundError } from './errors';
import { GeneratorStore } from './generator_store';
import { GeneratedInfo, previouslyGeneratedInfoSchema } from './schemas';

export const setLastGeneratedInfo = async (
	store: GeneratorStore,
	generatorAddress: Buffer,
	header: GeneratedInfo,
): Promise<void> => {
	const subStore = store.getGeneratorStore(GENERATOR_STORE_RESERVED_PREFIX_BUFFER);
	const generatedInfo: GeneratedInfo = {
		height: header.height,
		maxHeightGenerated: header.maxHeightGenerated,
		maxHeightPrevoted: header.maxHeightPrevoted,
	};
	const encodedGeneratedInfo = codec.encode(previouslyGeneratedInfoSchema, generatedInfo);
	await subStore.set(generatorAddress, encodedGeneratedInfo);
};

export const getLastGeneratedInfo = async (
	store: GeneratorStore,
	generatorAddress: Buffer,
): Promise<GeneratedInfo> => {
	const subStore = store.getGeneratorStore(GENERATOR_STORE_RESERVED_PREFIX_BUFFER);
	const encodedGeneratedInfo = await subStore.get(generatorAddress);
	return codec.decode<GeneratedInfo>(previouslyGeneratedInfoSchema, encodedGeneratedInfo);
};

export const getOrDefaultLastGeneratedInfo = async (
	store: GeneratorStore,
	generatorAddress: Buffer,
): Promise<GeneratedInfo> => {
	try {
		const info = await getLastGeneratedInfo(store, generatorAddress);
		return info;
	} catch (error) {
		if (!(error instanceof NotFoundError)) {
			throw error;
		}
		return {
			height: 0,
			maxHeightGenerated: 0,
			maxHeightPrevoted: 0,
		};
	}
};

export const isZeroValueGeneratedInfo = (info: GeneratedInfo): boolean =>
	info.height === 0 && info.maxHeightGenerated === 0 && info.maxHeightPrevoted === 0;

export const isEqualGeneratedInfo = (g1: GeneratedInfo, g2: GeneratedInfo): boolean =>
	g1.height === g2.height &&
	g1.maxHeightGenerated === g2.maxHeightGenerated &&
	g1.maxHeightPrevoted === g2.maxHeightPrevoted;
