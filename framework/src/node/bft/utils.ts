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
import { intToBuffer } from '@liskhq/lisk-cryptography';
import { BlockHeader, ImmutableSubStore } from '../state_machine';
import { SubStore } from '../state_machine/types';
import { GeneratorKeysNotFoundError } from './errors';
import { BFTVotesBlockInfo, GeneratorKeys, generatorKeysSchema } from './schemas';
import { BFTHeader, BFTValidator } from './types';

export const areDistinctHeadersContradicting = (b1: BFTHeader, b2: BFTHeader): boolean => {
	let earlierBlock = b1;
	let laterBlock = b2;
	const higherMaxHeightPreviouslyForged =
		earlierBlock.maxHeightGenerated > laterBlock.maxHeightGenerated;
	const sameMaxHeightPreviouslyForged =
		earlierBlock.maxHeightGenerated === laterBlock.maxHeightGenerated;
	const higherMaxHeightPrevoted = earlierBlock.maxHeightPrevoted > laterBlock.maxHeightPrevoted;
	const sameMaxHeightPrevoted = earlierBlock.maxHeightPrevoted === laterBlock.maxHeightPrevoted;
	const higherHeight = earlierBlock.height > laterBlock.height;
	if (
		higherMaxHeightPreviouslyForged ||
		(sameMaxHeightPreviouslyForged && higherMaxHeightPrevoted) ||
		(sameMaxHeightPreviouslyForged && sameMaxHeightPrevoted && higherHeight)
	) {
		[earlierBlock, laterBlock] = [laterBlock, earlierBlock];
	}
	// Blocks by different delegates are never contradicting
	if (!earlierBlock.generatorAddress.equals(laterBlock.generatorAddress)) {
		return false;
	}
	if (
		earlierBlock.maxHeightPrevoted === laterBlock.maxHeightPrevoted &&
		earlierBlock.height >= laterBlock.height
	) {
		/* Violation of the fork choice rule as validator moved to different chain
		 without strictly larger maxHeightPreviouslyForged or larger height as
		 justification. This in particular happens, if a validator is double forging. */
		return true;
	}

	if (earlierBlock.height > laterBlock.maxHeightGenerated) {
		return true;
	}

	if (earlierBlock.maxHeightPrevoted > laterBlock.maxHeightPrevoted) {
		return true;
	}
	return false;
};

export const getBlockBFTProperties = (header: BlockHeader): BFTVotesBlockInfo => ({
	generatorAddress: header.generatorAddress,
	height: header.height,
	maxHeightGenerated: header.maxHeightGenerated,
	maxHeightPrevoted: header.maxHeightPrevoted,
	precommitWeight: BigInt(0),
	prevoteWeight: BigInt(0),
});

export const sortValidatorsByAddress = (validators: { address: Buffer }[]) =>
	validators.sort((a, b) => a.address.compare(b.address));

export const sortValidatorsByBLSKey = (validators: { blsKey: Buffer }[]) =>
	validators.sort((a, b) => a.blsKey.compare(b.blsKey));

export const validatorsEqual = (v1: BFTValidator[], v2: BFTValidator[]): boolean => {
	if (v1.length !== v2.length) {
		return false;
	}
	for (let i = 0; i < v1.length; i += 1) {
		if (!v1[i].address.equals(v2[i].address)) {
			return false;
		}
		if (v1[i].bftWeight !== v2[i].bftWeight) {
			return false;
		}
	}

	return true;
};

export const getGeneratorKeys = async (
	keysStore: ImmutableSubStore,
	height: number,
): Promise<GeneratorKeys> => {
	const start = intToBuffer(0, 4);
	const end = intToBuffer(height, 4);
	const results = await keysStore.iterate({
		limit: 1,
		start,
		end,
		reverse: true,
	});
	if (results.length !== 1) {
		throw new GeneratorKeysNotFoundError();
	}
	const [result] = results;

	return codec.decode<GeneratorKeys>(generatorKeysSchema, result.value);
};

export const deleteGeneratorKeys = async (keysStore: SubStore, height: number): Promise<void> => {
	const start = intToBuffer(0, 4);
	const end = intToBuffer(height, 4);
	const results = await keysStore.iterate({
		start,
		end,
	});
	if (results.length <= 1) {
		return;
	}
	// Delete all BFT Parameters except the one of largest height which is at most the input height
	for (let i = 0; i < results.length - 1; i += 1) {
		await keysStore.del(results[i].key);
	}
};
