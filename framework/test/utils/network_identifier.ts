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
 */

import { getNetworkIdentifier as getNetworkID } from '@liskhq/lisk-cryptography';

interface NetworkIdentifierable {
	readonly transactionRoot: string;
	readonly communityIdentifier: string;
}

export const getNetworkIdentifier = (
	genesisBlock: NetworkIdentifierable,
): string =>
	getNetworkID(genesisBlock.transactionRoot, genesisBlock.communityIdentifier);

export const devnetNetworkIdentifier =
	'93d00fe5be70d90e7ae247936a2e7d83b50809c79b73fa14285f02c842348b3e';
