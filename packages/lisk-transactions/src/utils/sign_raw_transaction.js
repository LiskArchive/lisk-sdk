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
import cryptography from '@liskhq/lisk-cryptography';
import { getTimeWithOffset } from './time';
import prepareTransaction from './prepare_transaction';

export default function signRawTransaction({
	transaction,
	passphrase,
	secondPassphrase,
	timeOffset,
}) {
	const {
		publicKey,
		address,
	} = cryptography.getAddressAndPublicKeyFromPassphrase(passphrase);
	const senderSecondPublicKey = secondPassphrase
		? cryptography.getPrivateAndPublicKeyFromPassphrase(secondPassphrase)
				.publicKey
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
