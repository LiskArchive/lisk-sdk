/*
 * Copyright © 2017 Lisk Foundation
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
import passphrase from '../../src/passphrase/index';

describe('passphrase index.js', () => {
	it('should export an object', () => {
		return passphrase.should.be.type('object');
	});

	describe('menmonic module', () => {
		it('should have the BIP39 Mnemonic module', () => {
			return passphrase.Mnemonic.should.be.ok();
		});
	});

	describe('validation module', () => {
		it('should have the validation module', () => {
			return passphrase.validation.should.be.ok();
		});
	});
});
