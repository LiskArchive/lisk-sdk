/*
 * LiskHQ/lisk-commander
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
import { expect } from 'chai';
import * as mnemonic from '../../src/utils/mnemonic';

describe('mnemonic utils', () => {
	it('createMnemonicPassphrase should be a function', () => {
		return expect(mnemonic.createMnemonicPassphrase).to.be.a('function');
	});

	it('isValidMnemonicPassphrase should be a function', () => {
		return expect(mnemonic.isValidMnemonicPassphrase).to.be.a('function');
	});

	describe('#createMnemonicPassphrase', () => {
		it('the mnemonic passphrase should be a 12 word string', () => {
			const createdPassphrase = mnemonic.createMnemonicPassphrase();
			const mnemonicWords = createdPassphrase.split(' ').filter(Boolean);
			return expect(mnemonicWords).to.have.length(12);
		});
	});

	describe('#isValidMnemonicPassphrase', () => {
		it('should return true when the mnemonic passphrase is valid', () => {
			const validMnemonic =
				'minute omit local rare sword knee banner pair rib museum shadow juice';
			const valid = mnemonic.isValidMnemonicPassphrase(validMnemonic);
			return expect(valid).to.be.true;
		});

		it('should return false when the mnemonic passphrase is invalid', () => {
			const invalidMnemonic =
				'minute omit local rare sword knee banner pair rib museum shadow invalidAddition';
			const valid = mnemonic.isValidMnemonicPassphrase(invalidMnemonic);
			return expect(valid).to.be.false;
		});
	});

	describe('#createMnemonicPassphrase and #isValidMnemonicPassphrase integration', () => {
		it('a new mnemonic passphrase is created it should be valid', () => {
			const createdPassphrase = mnemonic.createMnemonicPassphrase();
			const valid = mnemonic.isValidMnemonicPassphrase(createdPassphrase);
			return expect(valid).to.be.true;
		});
	});
});
