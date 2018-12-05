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
import BigNum from 'browserify-bignum';
import { FIXED_POINT } from '../constants';
import { TransactionError } from '../errors';
import { Account } from '../transaction_types';

export const checkBalance = (
	account: Account,
	amount: BigNum,
): {
	readonly errors: ReadonlyArray<TransactionError>;
	readonly verified: boolean;
} => {
	const exceeded = new BigNum(account.balance).lt(amount);

	return {
		verified: !exceeded,
		errors: exceeded
			? [
					new TransactionError(
						`Account does not have enough LSK: ${
							account.address
						} balance: ${new BigNum(account.balance.toString()).div(
							FIXED_POINT,
						)}`,
					),
			  ]
			: [],
	};
};
