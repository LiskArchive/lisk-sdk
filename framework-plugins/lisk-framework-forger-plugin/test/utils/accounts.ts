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

import { cryptography } from 'lisk-sdk';

export const getRandomAccount = () => {
	const { publicKey, privateKey } = cryptography.legacy.getKeys(
		cryptography.utils.getRandomBytes(20).toString('hex'),
	);
	const address = cryptography.address.getAddressFromPublicKey(publicKey);

	return {
		address: cryptography.address.getLisk32AddressFromAddress(address),
		publicKey: publicKey.toString('hex'),
		privateKey: privateKey.toString('hex'),
		nonce: 0,
	};
};
