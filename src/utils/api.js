/*
 * LiskHQ/lisky
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
import lisk from 'lisk-js';
import config from './config';

const { APIClient } = lisk;

const getAPIClient = testnet => {
	const testnetOverrideValue =
		typeof testnet === 'boolean' ? testnet : config.api.testnet;
	return testnetOverrideValue === true
		? APIClient.createTestnetAPIClient(config.api)
		: APIClient.createMainnetAPIClient(config.api);
};

export default getAPIClient;
