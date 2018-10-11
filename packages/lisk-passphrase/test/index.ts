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
import Passphrase from '../src';

describe('passphrase index.js', () => {
	it('should export an object', () => expect(Passphrase).to.be.an('object'));

	describe('menmonic module', () => {
		it('should have the BIP39 Mnemonic module', () =>
			expect(Passphrase.Mnemonic).to.be.ok);
	});

	describe('validation module', () => {
		it('should have the validation module', () =>
			expect(Passphrase.validation).to.be.ok);
	});
});
