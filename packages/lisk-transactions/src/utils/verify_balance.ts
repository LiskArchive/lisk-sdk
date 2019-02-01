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
import * as BigNum from 'browserify-bignum';
import { TransactionError } from '../errors';
import { Account, IsVerifiedResponseWithError } from '../transaction_types';
import { convertBeddowsToLSK } from './';

export const verifyBalance = (
	sender: Account,
	amount: BigNum,
): IsVerifiedResponseWithError => {
	const exceeded = new BigNum(sender.balance).lt(new BigNum(amount));

	return {
		verified: !exceeded,
		error: exceeded
			? new TransactionError(
					`Account does not have enough LSK: ${
						sender.address
					}, balance: ${convertBeddowsToLSK(sender.balance.toString())}`,
			  )
			: undefined,
	};
};
