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
import { expect } from 'chai';
import { verifyBalance } from '../../../src/transactions/helpers';
import { TransactionError } from '../../../src/errors';

describe('#verifyBalance', () => {
	const defaultSender = {
		address: '18278674964748191682L',
		balance: '10000000',
		publicKey:
			'0eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c6793243',
		secondPublicKey: '',
	};
	const amount = new BigNum('999999');

	it('should return an object with boolean `verified` = true with sufficient account balance', () => {
		const { verified } = verifyBalance(defaultSender, amount);

		return expect(verified).to.be.true;
	});

	it('should return an object with boolean `verified` = false with insufficient account balance', () => {
		const invalidSender = {
			...defaultSender,
			balance: '1',
		};
		const { verified } = verifyBalance(invalidSender, amount);

		return expect(verified).to.be.false;
	});

	it('should return an object with a transaction error', () => {
		const invalidSender = {
			...defaultSender,
			balance: '1',
		};
		const { error } = verifyBalance(invalidSender, amount);
		return expect(error).to.be.instanceof(TransactionError);
	});
});
