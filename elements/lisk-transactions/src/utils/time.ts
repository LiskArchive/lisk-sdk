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
 *
 */

import { EPOCH_TIME_MILLISECONDS } from '../constants';

const MS_TIME = 1000;

export const getTimeFromBlockchainEpoch = (givenTimestamp?: number): number => {
	const startingPoint = givenTimestamp || new Date().getTime();
	const blockchainInitialTime = EPOCH_TIME_MILLISECONDS;

	return Math.floor((startingPoint - blockchainInitialTime) / MS_TIME);
};

export const getTimeWithOffset = (offset?: number): number => {
	const now = new Date().getTime();
	const timeWithOffset = offset ? now + offset * MS_TIME : now;

	return getTimeFromBlockchainEpoch(timeWithOffset);
};
