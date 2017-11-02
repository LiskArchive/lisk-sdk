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
import crypto from '../../crypto';

/**
* @method checkRecipientIdAndRecipientPublicKey
* @param {String} recipientId
* @param {String} recipientPublicKey
*
* @return {String}
*/

export default function checkRecipientIdAndRecipientPublicKey({
	recipientId,
	recipientPublicKey,
}) {
	if (recipientId && recipientPublicKey) {
		const addressFromPublicKey = crypto.getAddressFromPublicKey(
			recipientPublicKey,
		);
		if (recipientId === addressFromPublicKey) {
			return { address: recipientId, publicKey: recipientPublicKey };
		}
		throw new Error(
			'RecipientId and recipientPublicKey do not match. Please check.',
		);
	}

	if (recipientId === undefined && recipientPublicKey) {
		const addressFromPublicKey = crypto.getAddressFromPublicKey(
			recipientPublicKey,
		);
		return { address: addressFromPublicKey, publicKey: recipientPublicKey };
	}

	return { address: recipientId, publicKey: null };
}
