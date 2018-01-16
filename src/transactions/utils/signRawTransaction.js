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
import { getTimeWithOffset } from './time';
import prepareTransaction from './prepareTransaction';

export default function signRawTransaction({
	transaction,
	passphrase,
	secondPassphrase,
	timeOffset,
}) {
	const { publicKey, address } = crypto.getAddressAndPublicKeyFromPassphrase(
		passphrase,
	);
	const senderSecondPublicKey = secondPassphrase
		? crypto.getPrivateAndPublicKeyFromPassphrase(secondPassphrase).publicKey
		: null;

	const propertiesToAdd = {
		senderPublicKey: publicKey,
		senderSecondPublicKey,
		senderId: address,
		timestamp: getTimeWithOffset(timeOffset),
	};

	const transactionWithProperties = Object.assign(
		{},
		transaction,
		propertiesToAdd,
	);

	return prepareTransaction(
		transactionWithProperties,
		passphrase,
		secondPassphrase,
	);
}
