/*
 * Copyright © 2017 Lisk Foundation
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
import {
	LIVE_PORT,
	SSL_PORT,
	TEST_PORT,
	TESTNET_NETHASH,
	MAINNET_NETHASH,
} from 'constants';

export const getDefaultPort = (testnet, ssl) => {
	if (testnet) {
		return TEST_PORT;
	}
	if (ssl) {
		return SSL_PORT;
	}
	return LIVE_PORT;
};

export const getDefaultHeaders = (port, testnet) => {
	const commonNethash = {
		'Content-Type': 'application/json',
		os: 'lisk-js-api',
		version: '1.0.0',
		minVersion: '>=0.5.0',
		port,
		Accept: 'application/json',
	};
	if (testnet) {
		return Object.assign({}, commonNethash, {
			nethash: TESTNET_NETHASH,
			broadhash: TESTNET_NETHASH,
		});
	}
	return Object.assign({}, commonNethash, {
		nethash: MAINNET_NETHASH,
		broadhash: MAINNET_NETHASH,
	});
};
