/*
 * Copyright © 2020 Lisk Foundation
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
import {
	isValidFee,
	isValidNonce,
	validateNetworkIdentifier,
} from '@liskhq/lisk-validator';

import { RawAssetUnlock, UnlockTransaction } from './14_unlock_transaction';
import { TransactionJSON } from './transaction_types';
import { createBaseTransaction } from './utils';

export interface UnlockTokenInputs {
	readonly networkIdentifier: string;
	readonly nonce: string;
	readonly fee: string;
	readonly passphrase?: string;
	readonly unlockingObjects?: ReadonlyArray<RawAssetUnlock>;
}

interface GeneralInputs {
	readonly networkIdentifier: string;
	readonly fee: string;
	readonly nonce: string;
	readonly unlockingObjects?: ReadonlyArray<RawAssetUnlock>;
}

const validateInputs = ({
	fee,
	nonce,
	networkIdentifier,
	unlockingObjects,
}: GeneralInputs): void => {
	if (!isValidNonce(nonce)) {
		throw new Error('Nonce must be a valid number in string format.');
	}

	if (!isValidFee(fee)) {
		throw new Error('Fee must be a valid number in string format.');
	}

	validateNetworkIdentifier(networkIdentifier);

	if (!unlockingObjects?.length) {
		throw new Error('Unlocking object must present to create transaction.');
	}
};

export const unlockToken = (
	inputs: UnlockTokenInputs,
): Partial<TransactionJSON> => {
	validateInputs(inputs);
	const { networkIdentifier, passphrase, unlockingObjects } = inputs;

	const transaction = {
		...createBaseTransaction(inputs),
		type: 14,
		asset: {
			unlockingObjects,
		},
	};

	if (!passphrase) {
		return transaction;
	}

	const transactionWithSenderInfo = {
		...transaction,
		// SenderId and SenderPublicKey are expected to be exist from base transaction
		senderPublicKey: transaction.senderPublicKey as string,
		asset: {
			...transaction.asset,
		},
		networkIdentifier,
	};

	const unlockTransaction = new UnlockTransaction(transactionWithSenderInfo);
	unlockTransaction.sign(networkIdentifier, passphrase);

	const { errors } = unlockTransaction.validate();
	if (errors.length > 0) {
		throw new Error(errors.toString());
	}

	return unlockTransaction.toJSON();
};
