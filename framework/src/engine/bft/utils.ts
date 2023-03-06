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
import { utils } from '@liskhq/lisk-cryptography';
import { Validator } from '../../abi';
import {
	BFTVotesBlockInfo,
	ValidatorsHashInfo,
	ValidatorsHashInput,
	validatorsHashInputSchema,
} from './schemas';
import { BFTHeader } from './types';

export const areDistinctHeadersContradicting = (b1: BFTHeader, b2: BFTHeader): boolean => {
	let earlierBlock = b1;
	let laterBlock = b2;
	const higherMaxHeightGenerated = earlierBlock.maxHeightGenerated > laterBlock.maxHeightGenerated;
	const sameMaxHeightGenerated = earlierBlock.maxHeightGenerated === laterBlock.maxHeightGenerated;
	const higherMaxHeightPrevoted = earlierBlock.maxHeightPrevoted > laterBlock.maxHeightPrevoted;
	const sameMaxHeightPrevoted = earlierBlock.maxHeightPrevoted === laterBlock.maxHeightPrevoted;
	const higherHeight = earlierBlock.height > laterBlock.height;
	if (
		higherMaxHeightGenerated ||
		(sameMaxHeightGenerated && higherMaxHeightPrevoted) ||
		(sameMaxHeightGenerated && sameMaxHeightPrevoted && higherHeight)
	) {
		[earlierBlock, laterBlock] = [laterBlock, earlierBlock];
	}
	// Blocks by different validators are never contradicting
	if (!earlierBlock.generatorAddress.equals(laterBlock.generatorAddress)) {
		return false;
	}
	if (
		earlierBlock.maxHeightPrevoted === laterBlock.maxHeightPrevoted &&
		earlierBlock.height >= laterBlock.height
	) {
		/* Violation of the fork choice rule as validator moved to different chain
		 without strictly larger maxHeightGenerated or larger height as
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

export const computeValidatorsHash = (validators: Validator[], certificateThreshold: bigint) => {
	const activeValidators: ValidatorsHashInfo[] = [];
	for (const validator of validators) {
		activeValidators.push({
			blsKey: validator.blsKey,
			bftWeight: validator.bftWeight,
		});
	}
	sortValidatorsByBLSKey(activeValidators);
	const input: ValidatorsHashInput = {
		activeValidators,
		certificateThreshold,
	};
	const encodedValidatorsHashInput = codec.encode(validatorsHashInputSchema, input);
	return utils.hash(encodedValidatorsHashInput);
};
