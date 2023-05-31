/*
 * Copyright © 2023 Lisk Foundation
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

import { utils } from '@liskhq/lisk-cryptography';
import { EscrowStore } from '../../../../../src/modules/nft/stores/escrow';
import { LENGTH_CHAIN_ID, LENGTH_NFT_ID } from '../../../../../src/modules/nft/constants';

describe('EscrowStore', () => {
	let store: EscrowStore;

	beforeEach(() => {
		store = new EscrowStore('NFT', 5);
	});

	describe('getKey', () => {
		it('should concatenate the provided receivingChainID and nftID', () => {
			const receivingChainID = utils.getRandomBytes(LENGTH_CHAIN_ID);
			const nftID = utils.getRandomBytes(LENGTH_NFT_ID);

			expect(store.getKey(receivingChainID, nftID)).toEqual(
				Buffer.concat([receivingChainID, nftID]),
			);
		});
	});
});
