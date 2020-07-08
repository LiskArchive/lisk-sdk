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
import { getAddressFromPublicKey, hexToBuffer } from '@liskhq/lisk-cryptography';
import { isNumberString, isUInt64 } from '@liskhq/lisk-validator';

import { TransferTransaction } from './8_transfer_transaction';
import { BYTESIZES } from './constants';
import { createBaseTransaction, baseTransactionToJSON, convertKeysToBuffer } from './utils';
import { TransactionJSON } from './types';

export interface TransferInputs {
	readonly amount: string;
	readonly fee: string;
	readonly nonce: string;
	readonly networkIdentifier: string;
	readonly data: string;
	readonly recipientAddress?: string;
	readonly recipientPublicKey?: string;
	readonly senderPublicKey: string;
	readonly passphrase?: string;
	readonly passphrases?: ReadonlyArray<string>;
	readonly keys?: {
		readonly mandatoryKeys: Array<Readonly<string>>;
		readonly optionalKeys: Array<Readonly<string>>;
	};
}

const validateInputs = ({
	amount,
	recipientAddress,
	recipientPublicKey,
	data,
	networkIdentifier,
	fee,
	nonce,
}: TransferInputs): void => {
	if (!isNumberString(nonce) || !isUInt64(BigInt(nonce))) {
		throw new Error('Nonce must be a valid number in string format.');
	}

	if (!isNumberString(fee) || !isUInt64(BigInt(fee))) {
		throw new Error('Fee must be a valid number in string format.');
	}

	if (!isNumberString(amount) || !isUInt64(BigInt(amount))) {
		throw new Error('Amount must be a valid number in string format.');
	}

	if (!recipientAddress && !recipientPublicKey) {
		throw new Error('Either recipientAddress or recipientPublicKey must be provided.');
	}

	if (typeof recipientAddress !== 'undefined') {
		if (hexToBuffer(recipientAddress).length !== 20) {
			throw new Error('Invalid recipient address length');
		}
	}

	if (typeof recipientPublicKey !== 'undefined') {
		if (hexToBuffer(recipientPublicKey).length !== 32) {
			throw new Error('Invalid recipient public key length');
		}
	}

	if (
		recipientAddress &&
		recipientPublicKey &&
		hexToBuffer(recipientAddress).equals(getAddressFromPublicKey(hexToBuffer(recipientPublicKey)))
	) {
		throw new Error('recipientAddress does not match recipientPublicKey.');
	}

	if (data && data.length > 0) {
		if (typeof data !== 'string') {
			throw new Error('Invalid encoding in transaction data. Data must be utf-8 encoded string.');
		}
		if (data.length > BYTESIZES.DATA) {
			throw new Error('Transaction data field cannot exceed 64 bytes.');
		}
	}

	if (hexToBuffer(networkIdentifier).length !== 32) {
		throw new Error('Invalid network identifier length');
	}
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
		senderPublicKey,
	} = inputs;

	const recipientAddressFromPublicKey = recipientPublicKey
		? getAddressFromPublicKey(hexToBuffer(recipientPublicKey))
		: undefined;
	const recipientAddress = inputs.recipientAddress
		? hexToBuffer(inputs.recipientAddress)
		: recipientAddressFromPublicKey;
	const networkIdentifierBytes = hexToBuffer(networkIdentifier);

	const transaction = {
		...createBaseTransaction(inputs),
		type: TransferTransaction.TYPE,
		// For txs from multisig senderPublicKey must be set before attempting signing
		senderPublicKey: hexToBuffer(senderPublicKey),
		asset: {
			amount: BigInt(amount),
			recipientAddress: recipientAddress as Buffer,
			data,
		},
	} as TransferTransaction;

	if (!passphrase && !passphrases?.length) {
		return baseTransactionToJSON(transaction);
	}

	const transferTransaction = new TransferTransaction(transaction);

	if (passphrase) {
		transferTransaction.sign(networkIdentifierBytes, passphrase);

		return baseTransactionToJSON(transferTransaction);
	}

	if (passphrases && inputs.keys) {
		const keys = convertKeysToBuffer(inputs.keys);

		transferTransaction.sign(networkIdentifierBytes, undefined, passphrases, keys);

		return baseTransactionToJSON(transferTransaction);
	}

	return baseTransactionToJSON(transferTransaction);
};
