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
import {
	APIClient,
	constants,
	cryptography,
	p2p,
	passphrase,
	transactionPool,
	transactions,
	validator,
} from '../src';

describe('lisk-elements', () => {
	it('APIClient should be a function', () => {
		return expect(APIClient).toBeFunction();
	});

	it('constants should be an object', () => {
		return expect(constants).toBeObject();
	});

	it('cryptography should be an object', () => {
		return expect(cryptography).toBeObject();
	});

	it('p2p should be an object', () => {
		return expect(p2p).toBeObject();
	});

	it('passphrase should be an object', () => {
		return expect(passphrase).toBeObject();
	});

	it('transactionPool should be an object', () => {
		return expect(transactionPool).toBeObject();
	});

	it('transactions should be an object', () => {
		return expect(transactions).toBeObject();
	});

	it('validator should be an object', () => {
		return expect(validator).toBeObject();
	});
});
