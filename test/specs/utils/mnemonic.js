/*
 * LiskHQ/lisky
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
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('mnemonic util', () => {
	describe('#createMnemonicPassphrase', () => {
		describe('When a new mnemonic passphrase is created', () => {
			beforeEach(when.aNewMnemonicPassphraseIsCreated);
			it('Then the mnemonic passphrase should be a 12 word string', then.theMnemonicPassphraseShouldBeA12WordString);
		});
	});
	describe('#isValidMnemonicPassphrase', () => {
		describe('Given a valid mnemonic passphrase "minute omit local rare sword knee banner pair rib museum shadow juice"', () => {
			beforeEach(given.aValidMnemonicPassphrase);
			describe('When the mnemonic passphrase is validated', () => {
				beforeEach(when.theMnemonicPassphraseIsValidated);
				it('Then it should return true', then.itShouldReturnTrue);
			});
		});
		describe('Given an invalid mnemonic passphrase "minute omit local rare sword knee banner pair rib museum shadow invalidAddition"', () => {
			beforeEach(given.anInvalidMnemonicPassphrase);
			describe('When the mnemonic passphrase is validated', () => {
				beforeEach(when.theMnemonicPassphraseIsValidated);
				it('Then it should return false', then.itShouldReturnFalse);
			});
		});
	});
	describe('#createMnemonicPassphrase and #isValidMnemonicPassphrase integration', () => {
		describe('When a new mnemonic passphrase is created', () => {
			beforeEach(when.aNewMnemonicPassphraseIsCreated);
			describe('When the mnemonic passphrase is validated', () => {
				beforeEach(when.theMnemonicPassphraseIsValidated);
				it('Then it should return true', then.itShouldReturnTrue);
			});
		});
	});
});
