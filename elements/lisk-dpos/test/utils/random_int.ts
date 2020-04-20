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

export const randomInt = (low: number, high: number): number => {
	return Math.round(Math.random() * (high - low) + low);
};

export const randomBigIntWithPowerof8 = (low: number, high: number): bigint => {
	const random = randomInt(low, high);
	return BigInt(random) * BigInt(10) ** BigInt(8);
};
