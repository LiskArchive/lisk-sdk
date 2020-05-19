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
/* eslint-disable @typescript-eslint/no-unsafe-return */
// https://developers.google.com/protocol-buffers/docs/encoding#structure
const WIRE_TYPE_TWO = 2; // string, bytes, object, array
const WIRE_TYPE_ZERO = 0; // uint32, uint64, sint32, sint64, boolean

export const readKey = (value: number): [number, number] => {
	const wireType = value & 7;
	if (wireType === WIRE_TYPE_TWO || wireType === WIRE_TYPE_ZERO) {
		const fieldNumber = value >>> 3;

		return [fieldNumber, wireType];
	}

	throw new Error('Value yields unsupported wireType');
};
