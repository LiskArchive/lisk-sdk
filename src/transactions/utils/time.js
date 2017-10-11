/*
 * Copyright © 2017 Lisk Foundation
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
 *
 */

import { EPOCH_TIME_MILLISECONDS } from '../../constants';

/**
 * @method getTimeFromBlockchainEpoch
 * @param {Number} givenTimestamp
 * @return {Number}
 */

export const getTimeFromBlockchainEpoch = (givenTimestamp) => {
	const startingPoint = givenTimestamp || new Date().getTime();
	const blockchainInitialTime = EPOCH_TIME_MILLISECONDS;
	return Math.floor((startingPoint - blockchainInitialTime) / 1000);
};

/**
* @method getTimeWithOffset
* @param {Number} offset
* @return {Number}
*/

export const getTimeWithOffset = (offset) => {
	const now = new Date().getTime();
	const timeWithOffset = offset
		? now + (offset * 1000)
		: now;
	return getTimeFromBlockchainEpoch(timeWithOffset);
};
