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
import * as transaction from '../src';

describe('transaction', () => {
	describe('exports', () => {
		it('should have #transfer', () => {
			return expect(transaction.transfer).toBeFunction();
		});

		it('should have #registerMultisignature', () => {
			return expect(transaction.registerMultisignature).toBeFunction();
		});

		it('should have #createSignatureObject', () => {
			return expect(transaction.createSignatureObject).toBeFunction();
		});

		it('should have #utils', () => {
			return expect(transaction.utils).toBeObject();
		});

		it('should have #constants', () => {
			return expect(transaction.constants).toBeObject();
		});
	});
});
