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
import { expect } from 'chai';
import { verifyBalance } from '../../src/utils';
import { TransactionError } from '../../src/errors';
import { validAccount as defaultSender } from '../../fixtures';

describe('#verifyBalance', () => {
	const amount = new BigNum('999999');

	it('should return a verified response with sufficient account balance', async () => {
		const { verified } = verifyBalance(defaultSender, amount);

		expect(verified).to.be.true;
	});

	it('should return an unverified response with insufficient account balance', async () => {
		const invalidSender = {
			...defaultSender,
			balance: '1',
		};
		const { verified, error } = verifyBalance(invalidSender, amount);

		expect(verified).to.be.false;
		expect(error).to.be.instanceof(TransactionError);
		expect(error)
			.to.be.instanceof(TransactionError)
			.and.have.property(
				'message',
				`Account does not have enough LSK: ${
					defaultSender.address
				}, balance: 0.00000001`,
			);
	});
});
