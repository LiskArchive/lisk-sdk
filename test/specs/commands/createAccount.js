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

describe('createAccount command', () => {
	describe('Given there is a Vorpal instance', () => {
		beforeEach(given.thereIsAVorpalInstance);
		describe('Given a a Mnemonic instance that returns a valid passphrase "outdoor client move tissue say march smoke before leg patient ride fade"', () => {
			beforeEach(given.aMnemonicInstance);
			afterEach(given.aMnemonicInstanceThatNeedsToBeRestored);
			describe('Given the vorpal instance has the command "create account"', () => {
				beforeEach(given.theVorpalInstanceHasTheCommand);
				describe('Given the command has "0" required inputs', () => {
					beforeEach(given.theCommandHasRequiredInputs);
					describe('When the user enters the "create account" command', () => {
						beforeEach(when.theUserEntersTheCommand);
						it('Then it should have "0" required arguments', then.itShouldHaveRequiredArguments);
						it('Then it should create a new account', then.itShouldCreateANewAccount);
						it('Then it should print the result in a table with passphrase "outdoor client move tissue say march smoke before leg patient ride fade" and publicKey "6853253130c9650dbabf9db0f325fa98619a85ac16615eb916624d49892211c5" and accountId "8271669804080666186L" ', then.itShouldTablePrintTheCreatedAccount);
					});

					describe('When the user enters the "create account --json" command', () => {
						beforeEach(when.theUserEntersTheCommand);
						it('Then it should print the result as json with passphrase "outdoor client move tissue say march smoke before leg patient ride fade" and publicKey "6853253130c9650dbabf9db0f325fa98619a85ac16615eb916624d49892211c5" and accountId "8271669804080666186L" ', then.itShouldJSONPrintTheCreatedAccount);
					});
				});
			});
		});
	});
});
