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

import { BlockHeader } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { BIG_ENDIAN, intToBuffer } from '@liskhq/lisk-cryptography';
import { ImmutableSubStore } from '../../node/state_machine';
import { MAX_UINT32 } from './constants';
import { BFTParameterNotFoundError } from './errors';
import { BFTVotesBlockInfo, BFTParameters, bftParametersSchema } from './schemas';
import { BFTHeader } from './types';

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
	precommitWeight: 0,
	prevoteWeight: 0,
});

export const getBFTParameters = async (
	paramsStore: ImmutableSubStore,
	height: number,
): Promise<BFTParameters> => {
	const start = intToBuffer(height, 4, BIG_ENDIAN);
	const end = intToBuffer(MAX_UINT32, 4, BIG_ENDIAN);
	const results = await paramsStore.iterate({
		limit: 1,
		start,
		end,
	});
	if (results.length !== 1) {
		throw new BFTParameterNotFoundError();
	}
	const [result] = results;
	return codec.decode<BFTParameters>(bftParametersSchema, result.value);
};

export const sortValidatorsByAddress = (validators: { address: Buffer }[]) =>
	validators.sort((a, b) => a.address.compare(b.address));

export const sortValidatorsByBLSKey = (validators: { blsKey: Buffer }[]) =>
	validators.sort((a, b) => a.blsKey.compare(b.blsKey));
