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
import { validateNetworkIdentifier } from '@liskhq/lisk-validator';

import { DelegateTransaction } from './10_delegate_transaction';
import { USERNAME_MAX_LENGTH } from './constants';
import { TransactionJSON } from './transaction_types';
import { createBaseTransaction } from './utils';

export interface RegisterDelegateInputs {
	readonly passphrase?: string;
	readonly secondPassphrase?: string;
	readonly username: string;
	readonly networkIdentifier: string;
	readonly nonce: string;
	readonly fee: string;
	readonly senderPublicKey?: string;
	readonly passphrases?: ReadonlyArray<string>;
	readonly keys?: {
		readonly mandatoryKeys: Array<Readonly<string>>;
		readonly optionalKeys: Array<Readonly<string>>;
		readonly numberOfSignatures: number;
	};
}

const validateInputs = ({
	username,
	networkIdentifier,
}: RegisterDelegateInputs): void => {
	if (!username || typeof username !== 'string') {
		throw new Error('Please provide a username. Expected string.');
	}

	if (username.length > USERNAME_MAX_LENGTH) {
		throw new Error(
			`Username length does not match requirements. Expected to be no more than ${USERNAME_MAX_LENGTH} characters.`,
		);
	}

	validateNetworkIdentifier(networkIdentifier);
};

export const registerDelegate = (
	inputs: RegisterDelegateInputs,
): Partial<TransactionJSON> => {
	validateInputs(inputs);
	const {
		username,
		passphrase,
		networkIdentifier,
		passphrases,
		keys,
		senderPublicKey,
	} = inputs;

	const transaction = {
		...createBaseTransaction(inputs),
		type: 10,
		// For txs from multisig senderPublicKey must be set before attempting signing
		senderPublicKey,
		asset: { username },
		networkIdentifier,
	};

	if (!passphrase && !passphrases?.length) {
		return transaction;
	}

	const delegateTransaction = new DelegateTransaction(transaction);

	if (passphrase) {
		delegateTransaction.sign(networkIdentifier, passphrase);
	}

	if (passphrases && keys) {
		delegateTransaction.sign(networkIdentifier, undefined, passphrases, keys);
	}

	return delegateTransaction.toJSON();
};
