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
export const makeInvalid = (buffer: Buffer): Buffer => {
	const replace = buffer[0] % 2 === 0 ? 1 : 2;
	// eslint-disable-next-line no-param-reassign
	buffer[0] = replace;
	return buffer;
};
