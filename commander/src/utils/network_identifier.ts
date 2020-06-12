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
import { isBase64String } from '@liskhq/lisk-validator';

import { COMMUNITY_IDENTIFIER, NETHASHES } from './constants';

export const getNetworkIdentifierWithInput = (
	input: string | undefined,
	networkConfig: string | undefined,
): string => {
	if (input !== undefined && Object.keys(NETHASHES).includes(input)) {
		return getNetworkIdentifier(
			Buffer.from(NETHASHES[input], 'base64'),
			COMMUNITY_IDENTIFIER,
		).toString('base64');
	}
	if (input !== undefined) {
		if (!isBase64String(input)) {
			throw new Error('Network identifier must be base64 string');
		}

		return input;
	}

	if (
		networkConfig !== undefined &&
		Object.keys(NETHASHES).includes(networkConfig)
	) {
		return getNetworkIdentifier(
			Buffer.from(NETHASHES[networkConfig], 'base64'),
			COMMUNITY_IDENTIFIER,
		).toString('base64');
	}
	throw new Error('Invalid network identifier');
};
