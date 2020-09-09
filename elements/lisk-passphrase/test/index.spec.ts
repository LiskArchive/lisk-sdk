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
import * as passphrase from '../src';

describe('passphrase index.js', () => {
	it('should export an object', () => {
		return expect(passphrase).toEqual(expect.any(Object));
	});

	describe('mnemonic module', () => {
		it('should have the BIP39 Mnemonic module', () => {
			return expect(passphrase.Mnemonic).toBeTruthy();
		});
	});

	describe('validation module', () => {
		it('should have the validation module', () => {
			return expect(passphrase.validation).toBeTruthy();
		});
	});
});
