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
import { UserStore } from '../../../../../src/modules/nft/stores/user';
import { LENGTH_ADDRESS, LENGTH_NFT_ID } from '../../../../../src/modules/nft/constants';

describe('UserStore', () => {
	let store: UserStore;

	beforeEach(() => {
		store = new UserStore('NFT', 5);
	});

	describe('getKey', () => {
		it('should concatenate the provided address and nftID', () => {
			const address = utils.getRandomBytes(LENGTH_ADDRESS);
			const nftID = utils.getRandomBytes(LENGTH_NFT_ID);

			expect(store.getKey(address, nftID)).toEqual(Buffer.concat([address, nftID]));
		});
	});
});
