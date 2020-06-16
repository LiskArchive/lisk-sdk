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

import { hexToBuffer } from '@liskhq/lisk-cryptography';
import { isUInt64, isNumberString } from '@liskhq/lisk-validator';

import { UnlockTransaction, Unlock } from './14_unlock_transaction';
import { TransactionJSON } from './types';
import { createBaseTransaction, baseTransactionToJSON } from './utils';

interface RawAssetUnlock {
	readonly delegateAddress: string;
	readonly amount: string;
	readonly unvoteHeight: number;
}

export interface UnlockTokenInputs {
	readonly networkIdentifier: string;
	readonly nonce: string;
	readonly fee: string;
	readonly passphrase?: string;
	readonly unlockObjects: ReadonlyArray<RawAssetUnlock>;
}

const validateInputs = ({
	fee,
	nonce,
	networkIdentifier,
	unlockObjects,
}: UnlockTokenInputs): void => {
	if (!isNumberString(nonce) || !isUInt64(BigInt(nonce))) {
		throw new Error('Nonce must be a valid number in string format.');
	}

	if (!isNumberString(fee) || !isUInt64(BigInt(fee))) {
		throw new Error('Fee must be a valid number in string format.');
	}

	if (hexToBuffer(networkIdentifier).length !== 32) {
		throw new Error('Invalid network identifier length');
	}

	if (!unlockObjects.length) {
		throw new Error('Unlocking object must present to create transaction.');
	}
};

const convertUnlockObjects = (
	unlockObjects: ReadonlyArray<RawAssetUnlock>,
): ReadonlyArray<Unlock> =>
	unlockObjects.map(unlock => ({
		delegateAddress: hexToBuffer(unlock.delegateAddress),
		amount: BigInt(unlock.amount),
		unvoteHeight: unlock.unvoteHeight,
	}));

export const unlockToken = (
	inputs: UnlockTokenInputs,
): Partial<TransactionJSON> => {
	validateInputs(inputs);
	const { passphrase, unlockObjects } = inputs;
	const unlockAsset = convertUnlockObjects(unlockObjects);
	const networkIdentifier = hexToBuffer(inputs.networkIdentifier);

	const transaction = {
		...createBaseTransaction(inputs),
		type: UnlockTransaction.TYPE,
		asset: {
			unlockObjects: unlockAsset,
		},
	};

	if (!passphrase) {
		return baseTransactionToJSON(transaction as UnlockTransaction);
	}

	const unlockTransaction = new UnlockTransaction(
		transaction as UnlockTransaction,
	);
	unlockTransaction.sign(networkIdentifier, passphrase);

	const { errors } = unlockTransaction.validate();
	if (errors.length > 0) {
		throw new Error(errors.toString());
	}

	return baseTransactionToJSON(transaction as UnlockTransaction);
};
