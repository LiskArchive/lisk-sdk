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

export const formatInt = (num: number | bigint): string => {
	let buf: Buffer;
	if (typeof num === 'bigint') {
		buf = Buffer.alloc(8);
		buf.writeBigInt64BE(num);
	} else {
		buf = Buffer.alloc(4);
		buf.writeInt32BE(num);
	}
	return buf.toString('binary');
};

export const getFirstPrefix = (prefix: string): string => `${prefix}\x00`;
export const getLastPrefix = (prefix: string): string => `${prefix}\xFF`;
