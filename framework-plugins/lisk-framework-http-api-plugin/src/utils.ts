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

export const paginateList = <T>(
	list: ReadonlyArray<T>,
	limit = 100,
	offset = 0,
): ReadonlyArray<T> => {
	if (offset === 0) {
		return list.slice(0, Math.min(limit, list.length));
	}

	return list.slice(offset, Math.min(limit + offset, list.length));
};
