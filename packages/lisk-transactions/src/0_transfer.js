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
import cryptography from 'lisk-cryptography';
import { BYTESIZES, TRANSFER_FEE } from './constants';
import {
	wrapTransactionCreator,
	validateAmount,
	validateAddress,
	validatePublicKey,
} from './utils';

const createAsset = data => {
	if (data && data.length > 0) {
		return { data };
	}
	return {};
};

const validateInputs = ({ amount, recipientId, recipientPublicKey, data }) => {
	if (!validateAmount(amount)) {
		throw new Error(
			'Please provide an amount. Expected a valid number in string format.',
		);
	}

	if (recipientId) {
		validateAddress(recipientId);
	}

	if (recipientPublicKey) {
		validatePublicKey(recipientPublicKey);
	}

	if (recipientId && recipientPublicKey) {
		const addressFromPublicKey = cryptography.getAddressFromPublicKey(
			recipientPublicKey,
		);
		if (recipientId !== addressFromPublicKey) {
			throw new Error(
				'Could not create transaction: recipientId does not match recipientPublicKey.',
			);
		}
	}

	if (data && data.length > 0) {
		if (data.length > BYTESIZES.DATA) {
			throw new Error('Transaction data field cannot exceed 64 bytes.');
		}
		if (data !== data.toString('utf8')) {
			throw new Error(
				'Invalid encoding in transaction data. Data must be utf-8 encoded.',
			);
		}
	}
};

const transfer = inputs => {
	validateInputs(inputs);
	const { amount, recipientId, recipientPublicKey, data } = inputs;
	let address = recipientId;
	let publicKey = null;

	if (recipientPublicKey) {
		address = cryptography.getAddressFromPublicKey(recipientPublicKey);
		publicKey = recipientPublicKey;
	}

	const transaction = {
		type: 0,
		amount: amount.toString(),
		fee: TRANSFER_FEE.toString(),
		recipientId: address,
		recipientPublicKey: publicKey,
		asset: createAsset(data),
	};

	return transaction;
};

export default wrapTransactionCreator(transfer);
