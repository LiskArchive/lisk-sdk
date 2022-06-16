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
export const concatDBKeys = (...keys: Buffer[]) => Buffer.concat(keys);

export const uint32BE = (val: number): Buffer => {
	const result = Buffer.alloc(4);
	result.writeUInt32BE(val, 0);
	return result;
};
