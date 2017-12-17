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

export const hasNoDuplication = publicKeys => {
	publicKeys.forEach((element, index) => {
		const elementFound = publicKeys.indexOf(element);
		if (elementFound > -1 && elementFound !== index) {
			throw new Error(`Duplicated public key: ${publicKeys[index]}.`);
		}
	});

	return true;
};
