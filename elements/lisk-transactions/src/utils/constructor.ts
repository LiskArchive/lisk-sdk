import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';

/*
 * Copyright © 2018 Lisk Foundation
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

export const decideOnRecipientId = (
	recipientId?: string | null,
	recipientPublicKey?: string,
	noValue = '',
): string => {
	// Always assign passed receipientId if present
	if (recipientId) {
		return recipientId;
	}
	// Obtain recipientId out of recipientPublicKey if no recipientId
	if (recipientPublicKey) {
		return getAddressFromPublicKey(recipientPublicKey);
	}

	// Assign noValue if neither recipientId nor recipientPublicKey
	return noValue;
};

export const decideOnSenderId = (
	senderId?: string | null,
	senderPublicKey?: string,
	noValue = '',
): string => {
	// Always assign passed senderId if present
	if (senderId) {
		return senderId;
	}
	// Obtain senderId out of senderPublicKey if no recipientId
	if (senderPublicKey) {
		return getAddressFromPublicKey(senderPublicKey);
	}

	// Assign noValue if neither senderId nor senderPublicKey
	return noValue;
};
