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
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import { TransferTransaction } from './0_transfer_transaction';
import { BYTESIZES, TRANSFER_FEE } from './constants';
import { TransactionJSON } from './transaction_types';
import {
	createBaseTransaction,
	validateAddress,
	validatePublicKey,
	validateTransferAmount,
} from './utils';

export interface TransferInputs {
	readonly amount: string;
	readonly data?: string;
	readonly passphrase?: string;
	readonly recipientId?: string;
	readonly recipientPublicKey?: string;
	readonly secondPassphrase?: string;
	readonly timeOffset?: number;
}

const validateInputs = ({
	amount,
	recipientId,
	recipientPublicKey,
	data,
}: TransferInputs): void => {
	if (!validateTransferAmount(amount)) {
		throw new Error('Amount must be a valid number in string format.');
	}

	if (!recipientId && !recipientPublicKey) {
		throw new Error(
			'Either recipientId or recipientPublicKey must be provided.',
		);
	}

	if (typeof recipientId !== 'undefined') {
		validateAddress(recipientId);
	}

	if (typeof recipientPublicKey !== 'undefined') {
		validatePublicKey(recipientPublicKey);
	}

	if (
		recipientId &&
		recipientPublicKey &&
		recipientId !== getAddressFromPublicKey(recipientPublicKey)
	) {
		throw new Error('recipientId does not match recipientPublicKey.');
	}

	if (data && data.length > 0) {
		if (typeof data !== 'string') {
			throw new Error(
				'Invalid encoding in transaction data. Data must be utf-8 encoded string.',
			);
		}
		if (data.length > BYTESIZES.DATA) {
			throw new Error('Transaction data field cannot exceed 64 bytes.');
		}
	}
};

export const transfer = (inputs: TransferInputs): Partial<TransactionJSON> => {
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
