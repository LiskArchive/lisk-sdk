/*
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

export const prependPlusToPublicKeys = publicKeys =>
	publicKeys.map(publicKey => `+${publicKey}`);

export const prependMinusToPublicKeys = publicKeys =>
	publicKeys.map(publicKey => `-${publicKey}`);

export const validateKeysgroup = keysgroup => {
	if (keysgroup.length === 0 || keysgroup.length > 16) {
		throw new Error(
			'You must have between 1 and 16 public keys in the keysgroup.',
		);
	}
	return true;
};
