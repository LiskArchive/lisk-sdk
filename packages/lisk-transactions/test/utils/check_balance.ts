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
import { expect } from 'chai';
import { checkBalance } from '../../src/utils/check_balance';
import { Account } from '../../src/transaction_types';
import { TransactionError } from '../../src/errors';
import BigNum from 'browserify-bignum';

describe('#checkBalance', () => {
	let defaultAccount: Account;

	beforeEach(() => {
		defaultAccount = {
			address: '18278674964748191682L',
			balance: '10000000',
			publicKey:
				'0eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c6793243',
			secondPublicKey: '',
		};
	});

	it('should return an object with boolean `verified` = true with sufficient account balance', () => {
		const amount = new BigNum('999999');
		const { verified } = checkBalance(defaultAccount, amount);

		return expect(verified).to.be.true;
	});

	it('should return an object with boolean `verified` = false with insufficient account balance', () => {
		const amount = new BigNum('999999');
		const insufficientAccount = {
			...defaultAccount,
			balance: '1',
		};
		const { verified } = checkBalance(insufficientAccount, amount);

		return expect(verified).to.be.false;
	});

	it('should return an object with an array of transactions errors with insufficient account balance', () => {
		const amount = new BigNum('999999');
		const insufficientAccount = {
			...defaultAccount,
			balance: '1',
		};
		const { errors } = checkBalance(insufficientAccount, amount);
		const errorsArray = errors as ReadonlyArray<TransactionError>;

		return errorsArray.forEach(error =>
			expect(error).to.be.instanceof(TransactionError),
		);
	});
});
