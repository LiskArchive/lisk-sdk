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
import * as cryptography from '@liskhq/lisk-cryptography';
import { TransactionJSON } from '../transaction_types';
import { prepareTransaction } from './prepare_transaction';
import { getTimeWithOffset } from './time';

export interface SignRawTransactionInput {
	readonly passphrase: string;
	readonly secondPassphrase?: string;
	readonly timeOffset?: number;
	readonly transaction: TransactionJSON;
}

// FIXME: Deprecated
export const signRawTransaction = ({
	transaction,
	passphrase,
	secondPassphrase,
	timeOffset,
}: SignRawTransactionInput): TransactionJSON => {
	const {
		publicKey,
		address,
	} = cryptography.getAddressAndPublicKeyFromPassphrase(passphrase);
	const senderSecondPublicKey = secondPassphrase
		? cryptography.getPrivateAndPublicKeyFromPassphrase(secondPassphrase)
				.publicKey
		: undefined;

	const propertiesToAdd = {
		senderPublicKey: publicKey,
		senderSecondPublicKey,
		senderId: address,
		timestamp: getTimeWithOffset(timeOffset),
	};

	const transactionWithProperties = {
		...transaction,
		...propertiesToAdd,
	};

	return prepareTransaction(
		transactionWithProperties,
		passphrase,
		secondPassphrase,
	);
};
