/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
		When(
			'a new mnemonic passphrase is created',
			when.aNewMnemonicPassphraseIsCreated,
			() => {
				Then(
					'the mnemonic passphrase should be a 12 word string',
					then.theMnemonicPassphraseShouldBeA12WordString,
				);
			},
		);
	});
	describe('#isValidMnemonicPassphrase', () => {
		Given(
			'a valid mnemonic passphrase "minute omit local rare sword knee banner pair rib museum shadow juice"',
			given.aValidMnemonicPassphrase,
			() => {
				When(
					'the mnemonic passphrase is validated',
					when.theMnemonicPassphraseIsValidated,
					() => {
						Then('it should return true', then.itShouldReturnTrue);
					},
				);
			},
		);
		Given(
			'an invalid mnemonic passphrase "minute omit local rare sword knee banner pair rib museum shadow invalidAddition"',
			given.anInvalidMnemonicPassphrase,
			() => {
				When(
					'the mnemonic passphrase is validated',
					when.theMnemonicPassphraseIsValidated,
					() => {
						Then('it should return false', then.itShouldReturnFalse);
					},
				);
			},
		);
	});
	describe('#createMnemonicPassphrase and #isValidMnemonicPassphrase integration', () => {
		When(
			'a new mnemonic passphrase is created',
			when.aNewMnemonicPassphraseIsCreated,
			() => {
				When(
					'the mnemonic passphrase is validated',
					when.theMnemonicPassphraseIsValidated,
					() => {
						Then('it should return true', then.itShouldReturnTrue);
					},
				);
			},
		);
	});
});
