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

import { hexToBuffer } from '@liskhq/lisk-cryptography';

import { DelegateTransaction } from './10_delegate_transaction';
import { USERNAME_MAX_LENGTH } from './constants';
import { TransactionJSON } from './types';
import { createBaseTransaction, baseTransactionToJSON, convertKeysToBuffer } from './utils';

export interface RegisterDelegateInputs {
	readonly passphrase?: string;
	readonly secondPassphrase?: string;
	readonly username: string;
	readonly networkIdentifier: string;
	readonly nonce: string;
	readonly fee: string;
	readonly senderPublicKey: string;
	readonly passphrases?: ReadonlyArray<string>;
	readonly keys?: {
		readonly mandatoryKeys: Array<Readonly<string>>;
		readonly optionalKeys: Array<Readonly<string>>;
	};
}

const validateInputs = ({ username, networkIdentifier }: RegisterDelegateInputs): void => {
	if (!username || typeof username !== 'string') {
		throw new Error('Please provide a username. Expected string.');
	}

	if (username.length > USERNAME_MAX_LENGTH) {
		throw new Error(
			`Username length does not match requirements. Expected to be no more than ${USERNAME_MAX_LENGTH.toString()} characters.`,
		);
	}

	if (hexToBuffer(networkIdentifier).length !== 32) {
		throw new Error('Invalid network identifier length');
	}
};

export const registerDelegate = (inputs: RegisterDelegateInputs): Partial<TransactionJSON> => {
	validateInputs(inputs);
	const { username, passphrase, passphrases, senderPublicKey } = inputs;
	const networkIdentifier = hexToBuffer(inputs.networkIdentifier);

	const transaction = {
		...createBaseTransaction(inputs),
		type: DelegateTransaction.TYPE,
		// For txs from multisig senderPublicKey must be set before attempting signing
		senderPublicKey: hexToBuffer(senderPublicKey),
		asset: { username },
	} as DelegateTransaction;

	if (!passphrase && !passphrases?.length) {
		return baseTransactionToJSON(transaction);
	}

	const delegateTransaction = new DelegateTransaction(transaction);

	if (passphrase) {
		delegateTransaction.sign(networkIdentifier, passphrase);

		return baseTransactionToJSON(delegateTransaction);
	}

	if (passphrases && inputs.keys) {
		const keys = convertKeysToBuffer(inputs.keys);

		delegateTransaction.sign(networkIdentifier, undefined, passphrases, keys);

		return baseTransactionToJSON(delegateTransaction);
	}

	return baseTransactionToJSON(delegateTransaction);
};
