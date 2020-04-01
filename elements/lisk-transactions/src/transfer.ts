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
import {
	isValidFee,
	isValidNonce,
	isValidTransferAmount,
	validateAddress,
	validateNetworkIdentifier,
	validatePublicKey,
} from '@liskhq/lisk-validator';

import { TransferTransaction } from './8_transfer_transaction';
import { BYTESIZES } from './constants';
import { TransactionJSON } from './transaction_types';
import { createBaseTransaction } from './utils';

export interface TransferInputs {
	readonly amount: string;
	readonly fee: string;
	readonly nonce: string;
	readonly networkIdentifier: string;
	readonly data?: string;
	readonly recipientId?: string;
	readonly recipientPublicKey?: string;
	readonly senderPublicKey?: string;
	readonly passphrase?: string;
	readonly passphrases?: ReadonlyArray<string>;
	readonly keys?: {
		readonly mandatoryKeys: Array<Readonly<string>>;
		readonly optionalKeys: Array<Readonly<string>>;
	};
}

const validateInputs = ({
	amount,
	recipientId,
	recipientPublicKey,
	data,
	networkIdentifier,
	fee,
	nonce,
}: TransferInputs): void => {
	if (!isValidNonce(nonce)) {
		throw new Error('Nonce must be a valid number in string format.');
	}

	if (!isValidFee(fee)) {
		throw new Error('Fee must be a valid number in string format.');
	}

	if (!isValidTransferAmount(amount)) {
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

	validateNetworkIdentifier(networkIdentifier);
};

export const transfer = (inputs: TransferInputs): Partial<TransactionJSON> => {
	validateInputs(inputs);
	const {
		data,
		amount,
		recipientPublicKey,
		passphrase,
		networkIdentifier,
		passphrases,
		keys,
		senderPublicKey,
	} = inputs;

	const recipientIdFromPublicKey = recipientPublicKey
		? getAddressFromPublicKey(recipientPublicKey)
		: undefined;
	const recipientId = inputs.recipientId
		? inputs.recipientId
		: recipientIdFromPublicKey;

	const transaction = {
		...createBaseTransaction(inputs),
		type: 8,
		// For txs from multisig senderPublicKey must be set before attempting signing
		senderPublicKey,
		asset: {
			amount,
			recipientId: recipientId as string,
			data,
		},
	};

	if (!passphrase && !passphrases?.length) {
		return transaction;
	}

	const transactionWithSenderInfo = {
		...transaction,
		senderPublicKey: transaction.senderPublicKey as string,
		asset: {
			...transaction.asset,
			recipientId: recipientId as string,
		},
	};

	const transferTransaction = new TransferTransaction(
		transactionWithSenderInfo,
	);

	if (passphrase) {
		transferTransaction.sign(networkIdentifier, passphrase);

		return transferTransaction.toJSON();
	}

	if (passphrases && keys) {
		transferTransaction.sign(networkIdentifier, undefined, passphrases, keys);

		return transferTransaction.toJSON();
	}

	return transactionWithSenderInfo;
};
