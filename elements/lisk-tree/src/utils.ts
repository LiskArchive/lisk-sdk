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

export const binarySearch = <T = unknown>(array: T[], callback: (n: T) => boolean) => {
	let lo = -1;
	let hi = array.length;
	while (1 + lo < hi) {
		const mi = lo + ((hi - lo) >> 1); // eslint-disable-line no-bitwise
		if (callback(array[mi])) {
			hi = mi;
		} else {
			lo = mi;
		}
	}
	return hi;
};
