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
import { setUpInputStubs } from '../../steps/utils';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('create transaction register delegate command', () => {
	beforeEach(() => {
		setUpInputStubs();
	});
	describe('Given a Vorpal instance with a UI and an active command that can prompt', () => {
		beforeEach(given.aVorpalInstanceWithAUIAndAnActiveCommandThatCanPrompt);
		describe('Given an action "create transaction register delegate"', () => {
			beforeEach(given.anAction);
			describe('Given a delegate username "lightcurve"', () => {
				beforeEach(given.aDelegateUsername);
				describe('Given a passphrase "minute omit local rare sword knee banner pair rib museum shadow juice"', () => {
					beforeEach(given.aPassphrase);
					describe('Given a Lisk object that can create transactions', () => {
						beforeEach(given.aLiskObjectThatCanCreateTransactions);
						describe('Given an empty options object', () => {
							beforeEach(given.anEmptyOptionsObject);
							describe('Given an error "Unknown data source type. Must be one of `file`, or `stdin`." occurs retrieving the inputs from their sources', () => {
								beforeEach(given.anErrorOccursRetrievingTheInputsFromTheirSources);
								describe('When the action is called with the delegate username and the options', () => {
									beforeEach(when.theActionIsCalledWithTheDelegateUsernameAndTheOptions);
									it('Then it should reject with the error message', then.itShouldRejectWithTheErrorMessage);
								});
							});
							describe('Given the passphrase can be retrieved from its source', () => {
								beforeEach(given.thePassphraseCanBeRetrievedFromItsSource);
								describe('When the action is called with the delegate username and the options', () => {
									beforeEach(when.theActionIsCalledWithTheDelegateUsernameAndTheOptions);
									it('Then it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
									it('Then it should get the inputs from sources using the passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt);
									it('Then it should not get the inputs from sources using the second passphrase source', then.itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource);
									it('Then it should create a register delegate transaction using the passphrase and the delegate username', then.itShouldCreateARegisterDelegateTransactionUsingThePassphraseAndTheDelegateUsername);
									it('Then it should resolve to the created transaction', then.itShouldResolveToTheCreatedTransaction);
								});
							});
						});
						describe('Given an options object with passphrase set to "passphraseSource"', () => {
							beforeEach(given.anOptionsObjectWithPassphraseSetTo);
							describe('Given an error "Unknown data source type. Must be one of `file`, or `stdin`." occurs retrieving the inputs from their sources', () => {
								beforeEach(given.anErrorOccursRetrievingTheInputsFromTheirSources);
								describe('When the action is called with the delegate username and the options', () => {
									beforeEach(when.theActionIsCalledWithTheDelegateUsernameAndTheOptions);
									it('Then it should reject with the error message', then.itShouldRejectWithTheErrorMessage);
								});
							});
							describe('Given the passphrase can be retrieved from its source', () => {
								beforeEach(given.thePassphraseCanBeRetrievedFromItsSource);
								describe('When the action is called with the delegate username and the options', () => {
									beforeEach(when.theActionIsCalledWithTheDelegateUsernameAndTheOptions);
									it('Then it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
									it('Then it should get the inputs from sources using the passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt);
									it('Then it should not get the inputs from sources using the second passphrase source', then.itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource);
									it('Then it should create a register delegate transaction using the passphrase and the delegate username', then.itShouldCreateARegisterDelegateTransactionUsingThePassphraseAndTheDelegateUsername);
									it('Then it should resolve to the created transaction', then.itShouldResolveToTheCreatedTransaction);
								});
							});
						});
						describe('Given a second passphrase "fame spoil quiz garbage mirror envelope island rapid lend year bike adapt"', () => {
							beforeEach(given.aSecondPassphrase);
							describe('Given an options object with second passphrase set to "secondPassphraseSource"', () => {
								beforeEach(given.anOptionsObjectWithSecondPassphraseSetTo);
								describe('Given an error "Unknown data source type. Must be one of `file`, or `stdin`." occurs retrieving the inputs from their sources', () => {
									beforeEach(given.anErrorOccursRetrievingTheInputsFromTheirSources);
									describe('When the action is called with the delegate username and the options', () => {
										beforeEach(when.theActionIsCalledWithTheDelegateUsernameAndTheOptions);
										it('Then it should reject with the error message', then.itShouldRejectWithTheErrorMessage);
									});
								});
								describe('Given the passphrase and second passphrase can be retrieved from their sources', () => {
									beforeEach(given.thePassphraseAndSecondPassphraseCanBeRetrievedFromTheirSources);
									describe('When the action is called with the delegate username and the options', () => {
										beforeEach(when.theActionIsCalledWithTheDelegateUsernameAndTheOptions);
										it('Then it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
										it('Then it should get the inputs from sources using the passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt);
										it('Then it should get the inputs from sources using the second passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingTheSecondPassphraseSourceWithARepeatingPrompt);
										it('Then it should create a register delegate transaction using the passphrase, the second passphrase and the delegate username', then.itShouldCreateARegisterDelegateTransactionUsingThePassphraseTheSecondPassphraseAndTheDelegateUsername);
										it('Then it should resolve to the created transaction', then.itShouldResolveToTheCreatedTransaction);
									});
								});
							});
							describe('Given an options object with passphrase set to "passphraseSource" and second passphrase set to "secondPassphraseSource"', () => {
								beforeEach(given.anOptionsObjectWithPassphraseSetToAndSecondPassphraseSetTo);
								describe('Given an error "Unknown data source type. Must be one of `file`, or `stdin`." occurs retrieving the inputs from their sources', () => {
									beforeEach(given.anErrorOccursRetrievingTheInputsFromTheirSources);
									describe('When the action is called with the delegate username and the options', () => {
										beforeEach(when.theActionIsCalledWithTheDelegateUsernameAndTheOptions);
										it('Then it should reject with the error message', then.itShouldRejectWithTheErrorMessage);
									});
								});
								describe('Given the passphrase and second passphrase can be retrieved from their sources', () => {
									beforeEach(given.thePassphraseAndSecondPassphraseCanBeRetrievedFromTheirSources);
									describe('When the action is called with the delegate username and the options', () => {
										beforeEach(when.theActionIsCalledWithTheDelegateUsernameAndTheOptions);
										it('Then it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
										it('Then it should get the inputs from sources using the passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt);
										it('Then it should get the inputs from sources using the second passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingTheSecondPassphraseSourceWithARepeatingPrompt);
										it('Then it should create a register delegate transaction using the passphrase, the second passphrase and the delegate username', then.itShouldCreateARegisterDelegateTransactionUsingThePassphraseTheSecondPassphraseAndTheDelegateUsername);
										it('Then it should resolve to the created transaction', then.itShouldResolveToTheCreatedTransaction);
									});
								});
							});
						});
					});
				});
			});
		});
	});
});
