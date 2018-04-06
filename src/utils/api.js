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
import { NETHASHES } from './constants';

const { APIClient, constants } = lisk;

const addresses = {
	main: constants.MAINNET_NODES,
	test: constants.TESTNET_NODES,
	beta: constants.BETANET_NODES,
};

const getAPIClient = () => {
	const { node, network } = config.api;
	const nethash = NETHASHES[network] || network;
	const nodes = node ? [node] : addresses[network];
	return new APIClient(nodes, nethash);
};

export default getAPIClient;
