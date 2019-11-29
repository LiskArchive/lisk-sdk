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
import { DelegateTransaction } from './10_delegate_transaction';
import { DELEGATE_FEE, USERNAME_MAX_LENGTH } from './constants';
import { TransactionJSON } from './transaction_types';
import { createBaseTransaction, validateNetworkIdentifier } from './utils';

export interface RegisterDelegateInputs {
	readonly passphrase?: string;
	readonly secondPassphrase?: string;
	readonly timeOffset?: number;
	readonly username: string;
	readonly networkIdentifier: string;
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
	const { username, passphrase, secondPassphrase, networkIdentifier } = inputs;

	const transaction = {
		...createBaseTransaction(inputs),
		type: 10,
		fee: DELEGATE_FEE.toString(),
		asset: { username },
		networkIdentifier,
	};

	if (!passphrase) {
		return transaction;
	}

	const delegateTransaction = new DelegateTransaction(transaction);
	delegateTransaction.sign(passphrase, secondPassphrase);

	return delegateTransaction.toJSON();
};
