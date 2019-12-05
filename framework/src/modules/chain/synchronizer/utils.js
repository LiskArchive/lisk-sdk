/*
 * Copyright © 2019 Lisk Foundation
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

'use strict';

const { maxBy } = require('lodash');

const computeBlockHeightsList = (
	finalizedHeight,
	activeDelegates,
	listSizeLimit,
	currentRound,
) => {
	const startingHeight = Math.max(1, (currentRound - 1) * activeDelegates);
	const heightList = new Array(listSizeLimit)
		.fill(0)
		.map((_, i) => startingHeight - i * activeDelegates)
		.filter(height => height > 0);
	const heightListAfterFinalized = heightList.filter(
		height => height > finalizedHeight,
	);
	return heightList.length !== heightListAfterFinalized.length
		? [...heightListAfterFinalized, finalizedHeight]
		: heightListAfterFinalized;
};

// eslint-disable-next-line class-methods-use-this
const computeLargestSubsetMaxBy = (arrayOfObjects, propertySelectorFunc) => {
	const maximumBy = maxBy(arrayOfObjects, propertySelectorFunc);
	const absoluteMax = propertySelectorFunc(maximumBy);
	const largestSubset = [];
	// eslint-disable-next-line no-restricted-syntax
	for (const item of arrayOfObjects) {
		if (propertySelectorFunc(item) === absoluteMax) {
			largestSubset.push(item);
		}
	}
	return largestSubset;
};

module.exports = {
	computeBlockHeightsList,
	computeLargestSubsetMaxBy,
};
