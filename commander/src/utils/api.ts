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
import { APIClient } from '@liskhq/lisk-api-client';
import { NETHASHES } from './constants';

const seedNodes: { readonly [key: string]: ReadonlyArray<string> } = {
	main: APIClient.constants.MAINNET_NODES,
	test: APIClient.constants.TESTNET_NODES,
};

interface APIClientOptions {
	readonly network: string;
	readonly nodes: ReadonlyArray<string>;
}

export const getAPIClient = ({
	nodes,
	network,
}: APIClientOptions): APIClient => {
	const nethash = NETHASHES[network] || network;
	const clientNodes = nodes && nodes.length > 0 ? nodes : seedNodes[network];

	return new APIClient(clientNodes, { nethash });
};
