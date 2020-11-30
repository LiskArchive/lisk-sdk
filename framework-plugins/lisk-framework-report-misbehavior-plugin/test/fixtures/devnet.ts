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

export const genesisBlockID = Buffer.from(genesisBlock.header.id, 'hex');
export const communityIdentifier = 'Lisk';

export const networkIdentifier = getNetworkIdentifier(genesisBlockID, communityIdentifier);

export const defaultAccount = {
	encryptedPassphrase:
		'iterations=1000000&cipherText=12a982c7282ac78ca81d634a3a8211ad9561c5d79421abb6652105fad34e3a55d9dce93094aa6fd47a033e4d4c90c2cdfc9befa95e424f4892a48a6278382be61fc610ef91ef19&iv=69d5333b4ae6a6298f489dfe&salt=b2b2cee95e2151e3159ab49dbf4143e0&tag=321d2d7f4d686fde657dc9201ecf70a3&version=1',
	password: 'stairs boring cheese sleep token proud spider mixture lawn ethics retreat arch',
	passphrase: 'task little seat echo sheriff swim december enact lemon upon feel scrap',
};
