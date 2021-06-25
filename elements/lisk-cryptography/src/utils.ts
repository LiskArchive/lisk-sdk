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
 *
 */

export const readBit = (buf: Buffer, bit: number): boolean => {
	const byteIndex = Math.floor(bit / 8);
	const bitIndex = bit % 8;

	// eslint-disable-next-line no-bitwise
	return (buf[byteIndex] >> bitIndex) % 2 === 1;
};

export const writeBit = (buf: Buffer, bit: number, val: boolean): void => {
	const byteIndex = Math.floor(bit / 8);
	const bitIndex = bit % 8;

	if (val) {
		// eslint-disable-next-line no-bitwise, no-param-reassign
		buf[byteIndex] |= 1 << bitIndex;
	} else {
		// eslint-disable-next-line no-bitwise, no-param-reassign
		buf[byteIndex] &= ~(1 << bitIndex);
	}
};
