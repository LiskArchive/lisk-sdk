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
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import { TRANSFER_FEE } from './constants';
import {
	createBaseTransaction,
	TransferTransaction,
	validateInputs,
} from './transactions';

export interface TransferInputs {
	readonly amount: string;
	readonly data?: string;
	readonly passphrase?: string;
	readonly recipientId?: string;
	readonly recipientPublicKey?: string;
	readonly secondPassphrase?: string;
	readonly timeOffset?: number;
}

export const transfer = (inputs: TransferInputs): object => {
	validateInputs(inputs);
	const {
		data,
		amount,
		recipientPublicKey,
		passphrase,
		secondPassphrase,
	} = inputs;

	const recipientIdFromPublicKey = recipientPublicKey
		? getAddressFromPublicKey(recipientPublicKey)
		: undefined;
	const recipientId = inputs.recipientId
		? inputs.recipientId
		: recipientIdFromPublicKey;

	const transaction = {
		...createBaseTransaction(inputs),
		asset: data ? { data } : {},
		amount,
		fee: TRANSFER_FEE.toString(),
		recipientId: recipientId as string,
		recipientPublicKey,
		type: 0,
	};

	if (!passphrase) {
		return transaction;
	}

	const transactionWithSenderInfo = {
		...transaction,
		recipientId: recipientId as string,
		senderId: transaction.senderId as string,
		senderPublicKey: transaction.senderPublicKey as string,
	};

	const transferTransaction = new TransferTransaction(
		transactionWithSenderInfo,
	);
	transferTransaction.sign(passphrase, secondPassphrase);

	return transferTransaction.toJSON();
};
