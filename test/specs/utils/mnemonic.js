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
	describe('When a new mnemonic passphrase is created', () => {
		beforeEach(when.aNewMnemonicPassphraseIsCreated);
		it('Then it should generate a 12 word mnemonic passphrase string', then.theMnemonicPassphraseShouldBe12WordString);
	});
	describe('Given a valid mnemonic passphrase "outdoor client move tissue say march smoke before leg patient ride fade"', () => {
		beforeEach(given.aValidMnemonicPassphrase);
		describe('When the passphrase is attempted to be validated', () => {
			beforeEach(when.aMnemonicPassphraseIsValidated);
			it('The passphrase should validate to true', then.theMnemonicPassphraseShouldBeValid);
		});
	});
	describe('Given an invalid mnemonic passphrase "outdoor client move tissue say march smoke before leg patient ride invalidAddition"', () => {
		beforeEach(given.anInvalidMnemonicPassphrase);
		describe('When the passphrase is attempted to be validated', () => {
			beforeEach(when.aMnemonicPassphraseIsValidated);
			it('The passphrase should validate to false', then.theMnemonicPassphraseShouldBeInvalid);
		});
	});
});
