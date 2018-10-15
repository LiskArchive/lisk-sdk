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
import { DELEGATE_FEE, USERNAME_MAX_LENGTH } from './constants';
import { PartialTransaction } from './transaction_types';
import { prepareTransaction } from './utils';

export interface RegisterDelegateInputs {
	readonly passphrase?: string;
	readonly secondPassphrase?: string;
	readonly timeOffset?: number;
	readonly username: string;
}

const validateInputs = ({ username }: RegisterDelegateInputs) => {
	if (!username || typeof username !== 'string') {
		throw new Error('Please provide a username. Expected string.');
	}

	if (username.length > USERNAME_MAX_LENGTH) {
		throw new Error(
			`Username length does not match requirements. Expected to be no more than ${USERNAME_MAX_LENGTH} characters.`,
		);
	}
};

export const registerDelegate = (inputs: RegisterDelegateInputs) => {
	validateInputs(inputs);
	const { passphrase, secondPassphrase, timeOffset, username } = inputs;

	const transaction: PartialTransaction = {
		type: 2,
		fee: DELEGATE_FEE.toString(),
		asset: {
			delegate: {
				username,
			},
		},
	};

	return prepareTransaction(transaction, passphrase, secondPassphrase, timeOffset);
};