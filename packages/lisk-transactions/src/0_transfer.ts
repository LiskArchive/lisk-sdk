/*
 * copyright © 2018 lisk foundation
 *
 * see the license file at the top-level directory of this distribution
 * for licensing information.
 *
 * unless otherwise agreed in a custom licensing agreement with the lisk foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * license file.
 *
 * removal or modification of this copyright notice is prohibited.
 *
 */
import cryptography from '@liskhq/lisk-cryptography';
import { BYTESIZES, TRANSFER_FEE } from './constants';
import {
	BaseTransaction,
	PartialTransaction,
	TransferAsset,
} from './types/transactions';
import {
	prepareTransaction,
	validateAddress,
	validatePublicKey,
	validateTransferAmount,
} from './utils';

const createAsset = (data?: string): TransferAsset => {
	if (data && data.length > 0) {
		return { data };
	}

	return {};
};

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
		recipientId !== cryptography.getAddressFromPublicKey(recipientPublicKey)
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

export const transfer = (inputs: TransferInputs): BaseTransaction => {
	validateInputs(inputs);
	const {
		data,
		amount,
		recipientPublicKey,
		passphrase,
		secondPassphrase,
		timeOffset,
	} = inputs;
	const recipientId = recipientPublicKey
		? inputs.recipientId
		: cryptography.getAddressFromPublicKey(recipientPublicKey);

	const transaction: PartialTransaction = {
		type: 0,
		amount: amount.toString(),
		fee: TRANSFER_FEE.toString(),
		recipientId,
		recipientPublicKey,
		asset: createAsset(data),
	};

	return prepareTransaction(
		transaction,
		passphrase,
		secondPassphrase,
		timeOffset,
	);
};
