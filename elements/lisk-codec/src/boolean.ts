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
/* eslint-disable no-bitwise */
/* eslint-disable no-param-reassign */

export const writeBoolean = (value: boolean): Buffer =>
	value ? Buffer.from('01', 'hex') : Buffer.from('00', 'hex');

export const readBoolean = (buffer: Buffer, offset: number): [boolean, number] => {
	const val = buffer[offset];
	if (val !== 0x00 && val !== 0x01) {
		throw new Error('Invalid boolean bytes.');
	}
	return [val !== 0x00, 1];
};
