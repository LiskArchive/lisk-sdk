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
import { getKeys } from '@liskhq/lisk-cryptography';
import { SecondSignatureTransaction } from './1_second_signature_transaction';
import { SIGNATURE_FEE } from './constants';
import { TransactionJSON } from './transaction_types';
import { createBaseTransaction } from './utils';

export interface SecondPassphraseInputs {
	readonly passphrase?: string;
	readonly secondPassphrase: string;
	readonly timeOffset?: number;
}

const validateInputs = ({
	secondPassphrase,
}: {
	readonly secondPassphrase: string;
}): void => {
	if (typeof secondPassphrase !== 'string') {
		throw new Error('Please provide a secondPassphrase. Expected string.');
	}
};

export const registerSecondPassphrase = (
	inputs: SecondPassphraseInputs,
): Partial<TransactionJSON> => {
	validateInputs(inputs);
	const { passphrase, secondPassphrase } = inputs;
	const { publicKey } = getKeys(secondPassphrase);

	const transaction = {
		...createBaseTransaction(inputs),
		type: 1,
		fee: SIGNATURE_FEE.toString(),
		asset: { signature: { publicKey } },
	};

	if (!passphrase) {
		return transaction;
	}

	const secondSignatureTransaction = new SecondSignatureTransaction(
		transaction as TransactionJSON,
	);
	secondSignatureTransaction.sign(passphrase);

	return secondSignatureTransaction.toJSON();
};
