/*
 * LiskHQ/lisk-commander
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
import {
	BaseTransaction,
	DelegateTransaction,
	MultisignatureTransaction,
	SecondSignatureTransaction,
	TransactionJSON,
	TransferTransaction,
	VoteTransaction,
} from '@liskhq/lisk-transactions';
import { ValidationError } from './error';

export const parseTransactionString = (transactionStr: string) => {
	try {
		return JSON.parse(transactionStr);
	} catch (error) {
		throw new ValidationError('Could not parse transaction JSON.');
	}
};

// tslint:disable-next-line no-any
const defaultTransactions: { readonly [key: number]: any } = {
	8: TransferTransaction,
	9: SecondSignatureTransaction,
	10: DelegateTransaction,
	11: VoteTransaction,
	12: MultisignatureTransaction,
};

export const instantiateTransaction = (
	data: TransactionJSON,
): BaseTransaction => {
	if (data.type === undefined || data.type === null) {
		throw new Error('Invalid transaction without type');
	}

	if (!Object.keys(defaultTransactions).includes(String(data.type))) {
		throw new Error(`Transaction type ${data.type} is not supported`);
	}
	// tslint:disable-next-line variable-name
	const TransactionClass = defaultTransactions[data.type];

	return new TransactionClass(data);
};
