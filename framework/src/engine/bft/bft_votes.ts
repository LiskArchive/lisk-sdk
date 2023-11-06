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
import { BFTParametersCache } from './bft_params';
import { BFTVotes } from './schemas';
import { getBlockBFTProperties } from './utils';

export const insertBlockBFTInfo = (
	bftVotes: BFTVotes,
	header: BlockHeader,
	maxLength: number,
): void => {
	// eslint-disable-next-line no-param-reassign
	bftVotes.blockBFTInfos = [getBlockBFTProperties(header), ...bftVotes.blockBFTInfos].slice(
		0,
		maxLength,
	);
};

export const getHeightNotPrevoted = (bftVotes: BFTVotes): number => {
	const [newBlockBFTInfo] = bftVotes.blockBFTInfos;
	const { height: currentHeight } = newBlockBFTInfo;
	let heightPreviousBlock = newBlockBFTInfo.maxHeightGenerated;

	// iterate over blockBFTInfo objects in decreasing order by height
	while (currentHeight - heightPreviousBlock < bftVotes.blockBFTInfos.length) {
		const blockBFTInfo = bftVotes.blockBFTInfos[currentHeight - heightPreviousBlock];
		if (
			!blockBFTInfo.generatorAddress.equals(newBlockBFTInfo.generatorAddress) ||
			blockBFTInfo.maxHeightGenerated >= heightPreviousBlock
		) {
			return heightPreviousBlock;
		}
		heightPreviousBlock = blockBFTInfo.maxHeightGenerated;
	}
	// return one less than the height of the blockBFTInfo with smallest height
	return bftVotes.blockBFTInfos[bftVotes.blockBFTInfos.length - 1].height - 1;
};

export const updatePrevotesPrecommits = async (
	bftVotes: BFTVotes,
	paramsCache: BFTParametersCache,
): Promise<void> => {
	// when processing the genesis block the array is empty and no prevotes or precommits need to be updated
	if (bftVotes.blockBFTInfos.length === 0) {
		return;
	}
	const [newBlockBFTInfo] = bftVotes.blockBFTInfos;
	// a block header only implies votes if maxHeightGenerated < height
	if (newBlockBFTInfo.maxHeightGenerated >= newBlockBFTInfo.height) {
		return;
	}
	const validatorInfo = bftVotes.activeValidatorsVoteInfo.find(v =>
		v.address.equals(newBlockBFTInfo.generatorAddress),
	);
	if (!validatorInfo) {
		// the validator does not exist, meaning it does not have bft stake weight
		return;
	}
	const heightNotPrevoted = getHeightNotPrevoted(bftVotes);

	const minPrecommitHeight = Math.max(
		validatorInfo.minActiveHeight,
		heightNotPrevoted + 1,
		validatorInfo.largestHeightPrecommit + 1,
	);
	let hasPrecommitted = false;

	for (const blockBFTInfo of bftVotes.blockBFTInfos) {
		if (blockBFTInfo.height < minPrecommitHeight) {
			break;
		}
		const params = await paramsCache.getParameters(blockBFTInfo.height);
		if (blockBFTInfo.prevoteWeight >= params.prevoteThreshold) {
			const bftValidator = params.validators.find(v =>
				v.address.equals(newBlockBFTInfo.generatorAddress),
			);
			if (!bftValidator) {
				throw new Error(
					`Invalid state. Validator ${newBlockBFTInfo.generatorAddress.toString(
						'hex',
					)} must be in the BFT parameters at height ${newBlockBFTInfo.height}`,
				);
			}
			blockBFTInfo.precommitWeight += bftValidator.bftWeight;
			if (!hasPrecommitted) {
				const activeValidatorIndex = bftVotes.activeValidatorsVoteInfo.findIndex(v =>
					v.address.equals(newBlockBFTInfo.generatorAddress),
				);
				if (activeValidatorIndex > -1) {
					// eslint-disable-next-line no-param-reassign
					bftVotes.activeValidatorsVoteInfo[activeValidatorIndex].largestHeightPrecommit =
						blockBFTInfo.height;
				}
				hasPrecommitted = true;
			}
		}
	}

	// add implied prevotes by newBlockheader
	const minPrevoteHeight = Math.max(
		newBlockBFTInfo.maxHeightGenerated + 1,
		validatorInfo.minActiveHeight,
	);
	for (const blockBFTInfo of bftVotes.blockBFTInfos) {
		if (blockBFTInfo.height < minPrevoteHeight) {
			break;
		}
		const params = await paramsCache.getParameters(blockBFTInfo.height);
		const bftValidator = params.validators.find(v =>
			v.address.equals(newBlockBFTInfo.generatorAddress),
		);
		if (!bftValidator) {
			throw new Error(
				`Invalid state. Validator ${newBlockBFTInfo.generatorAddress.toString(
					'hex',
				)} must be in the BFT parameters at height ${newBlockBFTInfo.height}`,
			);
		}
		blockBFTInfo.prevoteWeight += bftValidator.bftWeight;
	}
};

export const updateMaxHeightPrevoted = async (
	bftVotes: BFTVotes,
	paramsCache: BFTParametersCache,
): Promise<void> => {
	for (const blockBFTInfo of bftVotes.blockBFTInfos) {
		const params = await paramsCache.getParameters(blockBFTInfo.height);
		if (blockBFTInfo.prevoteWeight >= params.prevoteThreshold) {
			// eslint-disable-next-line no-param-reassign
			bftVotes.maxHeightPrevoted = blockBFTInfo.height;
			return;
		}
	}
};

export const updateMaxHeightPrecommitted = async (
	bftVotes: BFTVotes,
	paramsCache: BFTParametersCache,
): Promise<void> => {
	for (const blockBFTInfo of bftVotes.blockBFTInfos) {
		const params = await paramsCache.getParameters(blockBFTInfo.height);
		if (blockBFTInfo.precommitWeight >= params.precommitThreshold) {
			// eslint-disable-next-line no-param-reassign
			bftVotes.maxHeightPrecommitted = blockBFTInfo.height;
			return;
		}
	}
};

export const updateMaxHeightCertified = (bftVotes: BFTVotes, header: BlockHeader): void => {
	if (
		header.aggregateCommit.aggregationBits.length === 0 &&
		header.aggregateCommit.certificateSignature.length === 0
	) {
		return;
	}
	// eslint-disable-next-line no-param-reassign
	bftVotes.maxHeightCertified = header.aggregateCommit.height;
};
