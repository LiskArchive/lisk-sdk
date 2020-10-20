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

export const areHeadersContradicting = (b1: BlockHeader, b2: BlockHeader): boolean => {
	let earlierBlock = b1;
	let laterBlock = b2;
	const higherMaxHeightPreviouslyForged =
		earlierBlock.asset.maxHeightPreviouslyForged > laterBlock.asset.maxHeightPreviouslyForged;
	const sameMaxHeightPreviouslyForged =
		earlierBlock.asset.maxHeightPreviouslyForged === laterBlock.asset.maxHeightPreviouslyForged;
	const higherMaxHeightPrevoted =
		earlierBlock.asset.maxHeightPrevoted > laterBlock.asset.maxHeightPrevoted;
	const sameMaxHeightPrevoted =
		earlierBlock.asset.maxHeightPrevoted === laterBlock.asset.maxHeightPrevoted;
	const higherHeight = earlierBlock.height > laterBlock.height;
	if (
		higherMaxHeightPreviouslyForged ||
		(sameMaxHeightPreviouslyForged && higherMaxHeightPrevoted) ||
		(sameMaxHeightPreviouslyForged && sameMaxHeightPrevoted && higherHeight)
	) {
		[earlierBlock, laterBlock] = [laterBlock, earlierBlock];
	}
	// Blocks by different delegates are never contradicting
	if (!earlierBlock.generatorPublicKey.equals(laterBlock.generatorPublicKey)) {
		return false;
	}
	// No contradiction, as block headers are the same
	if (earlierBlock.id.equals(laterBlock.id)) {
		return false;
	}
	if (
		earlierBlock.asset.maxHeightPrevoted === laterBlock.asset.maxHeightPrevoted &&
		earlierBlock.height >= laterBlock.height
	) {
		/* Violation of the fork choice rule as validator moved to different chain
		 without strictly larger maxHeightPreviouslyForged or larger height as
		 justification. This in particular happens, if a validator is double forging. */
		return true;
	}

	if (earlierBlock.height > laterBlock.asset.maxHeightPreviouslyForged) {
		return true;
	}

	if (earlierBlock.asset.maxHeightPrevoted > laterBlock.asset.maxHeightPrevoted) {
		return true;
	}
	return false;
};
