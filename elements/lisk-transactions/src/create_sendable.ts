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
import { validateAddress, validatePublicKey } from '@liskhq/lisk-validator';

import { TransactionJSON } from './transaction_types';

import {
	getAddressFromPublicKey,
	getPrivateAndPublicKeyBytesFromPassphrase,
} from '@liskhq/lisk-cryptography';

const validateRequiredInputs = (
	type: number,
	passphrase: string,
	receipientId?: string | null,
	recipientPublicKey?: string,
): void => {
	if (!(receipientId || recipientPublicKey)) {
		throw new Error(
			'Either recipientId or recipientPublicKey must be provided.',
		);
	}

	if (typeof receipientId !== 'undefined' && receipientId !== null) {
		validateAddress(receipientId);
	}

	if (typeof recipientPublicKey !== 'undefined') {
		validatePublicKey(recipientPublicKey);
	}

	if (
		receipientId &&
		recipientPublicKey &&
		receipientId !== getAddressFromPublicKey(recipientPublicKey)
	) {
		throw new Error('recipientId does not match recipientPublicKey.');
	}

	if (!passphrase) {
		throw new Error(
			'Cannot sign a transaction without a passphrase. Specify your passphrase as in the input object (and optional second passphrase)',
		);
	}

	if (!type || typeof type !== 'number') {
		throw new Error('type must be provided.');
	}
};

const asJSON = (transaction: Partial<TransactionJSON>): string =>
	JSON.stringify(transaction);

const skipUndefined = (
	transaction: Partial<TransactionJSON>,
): Partial<TransactionJSON> =>
	// tslint:disable-next-line
	Object.entries(transaction).reduce(
		(transactionWithValues: object, [property, value]) => {
			if (value !== undefined) {
				Object.assign(transactionWithValues, { [property]: value });
			}

			return transactionWithValues;
		},
		{},
	);

export const createSendable = (
	// tslint:disable-next-line
	Transaction: any,
	inputs: Partial<TransactionJSON>,
	passphrase: string,
	secondPasshprase: string,
): string => {
	const type = Transaction.TYPE;
	const {
		amount,
		asset,
		fee,
		recipientId,
		recipientPublicKey,
		senderPublicKey,
		timestamp,
	} = inputs;
	validateRequiredInputs(type, passphrase, recipientId, recipientPublicKey);

	const recipientIdFromPublicKey = recipientPublicKey
		? getAddressFromPublicKey(recipientPublicKey)
		: undefined;

	if (!passphrase) {
		throw new Error(
			'Cannot sign a transaction without a passphrase. Specify your passphrase as in the input object (and optional second passphrase)',
		);
	}

	const senderKeyPair = getPrivateAndPublicKeyBytesFromPassphrase(passphrase);

	const transaction = new Transaction({
		asset: asset || {},
		amount,
		fee,
		recipientId: recipientIdFromPublicKey
			? recipientIdFromPublicKey
			: recipientId,
		senderPublicKey:
			senderPublicKey ||
			Buffer.from(senderKeyPair.publicKeyBytes).toString('hex'),
		type,
		timestamp: timestamp || 0,
	});

	transaction.sign(passphrase, secondPasshprase);

	return asJSON(skipUndefined(transaction.toJSON()));
};
