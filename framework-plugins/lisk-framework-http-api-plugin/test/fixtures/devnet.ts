/*
 * Copyright © 2020 Lisk Foundation
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

import { getNetworkIdentifier } from '@liskhq/lisk-cryptography';
import * as genesisBlock from '../../../../config/devnet/genesis_block.json';

export const genesisBlockTransactionRoot = Buffer.from(
	genesisBlock.header.transactionRoot,
	'base64',
);
export const communityIdentifier = 'Lisk';

export const networkIdentifier = getNetworkIdentifier(
	genesisBlockTransactionRoot,
	communityIdentifier,
);
