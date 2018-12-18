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
import * as cryptography from '@liskhq/lisk-cryptography';
import { SIGNATURE_FEE } from './constants';
import {
	PartialTransaction,
	SecondSignatureTransaction,
} from './transaction_types';
import { prepareTransaction } from './utils';

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
): SecondSignatureTransaction => {
	validateInputs(inputs);
	const { passphrase, secondPassphrase, timeOffset } = inputs;
	const { publicKey } = cryptography.getKeys(secondPassphrase);

	const transaction: PartialTransaction = {
		type: 1,
		fee: SIGNATURE_FEE.toString(),
		asset: {
			signature: {
				publicKey,
			},
		},
	};

	return prepareTransaction(
		transaction,
		passphrase,
		secondPassphrase,
		timeOffset,
	) as SecondSignatureTransaction;
};
