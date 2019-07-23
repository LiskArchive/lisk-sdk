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
 *
 */

import { getAddressAndPublicKeyFromPassphrase } from '@liskhq/lisk-cryptography';
import { getTimeWithOffset } from './time';

export interface CreateBaseTransactionInput {
	readonly passphrase?: string;
	readonly secondPassphrase?: string;
	readonly timeOffset?: number;
}

export const createBaseTransaction = ({
	passphrase,
	timeOffset,
}: CreateBaseTransactionInput) => {
	const { address: senderId, publicKey: senderPublicKey } = passphrase
		? getAddressAndPublicKeyFromPassphrase(passphrase)
		: { address: undefined, publicKey: undefined };
	const timestamp = getTimeWithOffset(timeOffset);

	return {
		amount: '0',
		recipientId: '',
		senderId,
		senderPublicKey,
		timestamp,
	};
};
