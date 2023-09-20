/*
 * Copyright © 2022 Lisk Foundation
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

import { CHAIN_ID_LENGTH, TOKEN_ID_LENGTH } from './constants';
import { TokenID } from './types';

export const splitTokenID = (tokenID: TokenID): [Buffer, Buffer] => {
	if (tokenID.length !== TOKEN_ID_LENGTH) {
		throw new Error(`Token ID must have length ${TOKEN_ID_LENGTH}`);
	}
	const chainID = tokenID.subarray(0, CHAIN_ID_LENGTH);
	const localID = tokenID.subarray(CHAIN_ID_LENGTH);

	return [chainID, localID];
};
