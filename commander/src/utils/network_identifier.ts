/*
 * LiskHQ/lisk-commander
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
import { getNetworkIdentifier } from '@liskhq/lisk-cryptography';
import { isHexString } from '@liskhq/lisk-validator';
import { COMMUNITY_IDENTIFIER, NETHASHES } from './constants';

export const getNetworkIdentifierWithInput = (
	input: string | undefined,
	networkConfig: string | undefined,
): string => {
	if (input !== undefined && Object.keys(NETHASHES).includes(input)) {
		return getNetworkIdentifier(NETHASHES[input], COMMUNITY_IDENTIFIER);
	}
	if (input !== undefined && isHexString(input)) {
		return input;
	}

	if (
		networkConfig !== undefined &&
		Object.keys(NETHASHES).includes(networkConfig)
	) {
		return getNetworkIdentifier(NETHASHES[networkConfig], COMMUNITY_IDENTIFIER);
	}
	throw new Error('Invalid network identifier');
};
