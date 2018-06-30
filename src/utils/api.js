/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
import elements from 'lisk-elements';
import { NETHASHES } from './constants';

const { APIClient } = elements;

const seedNodes = {
	main: APIClient.constants.MAINNET_NODES,
	test: APIClient.constants.TESTNET_NODES,
	beta: APIClient.constants.BETANET_NODES,
};

const getAPIClient = ({ nodes, network }) => {
	const nethash = NETHASHES[network] || network;
	const clientNodes = nodes && nodes.length > 0 ? nodes : seedNodes[network];
	return new APIClient(clientNodes, { nethash });
};

export default getAPIClient;
