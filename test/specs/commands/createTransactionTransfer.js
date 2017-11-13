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
import { setUpCommandCreateTransactionTransfer } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('create transaction transfer', () => {
	beforeEach(setUpCommandCreateTransactionTransfer);
	describe('Given a Vorpal instance with a UI and an active command that can prompt', () => {
		beforeEach(given.aVorpalInstanceWithAUIAndAnActiveCommandThatCanPrompt);
		describe('Given an action "create transaction transfer"', () => {
			beforeEach(given.anAction);
			describe('Given a passphrase "minute omit local rare sword knee banner pair rib museum shadow juice"', () => {
				beforeEach(given.aPassphrase);
				describe('Given a Lisk object that can create transactions', () => {
					beforeEach(given.aLiskObjectThatCanCreateTransactions);
					describe('Given an empty options object', () => {
						beforeEach(given.anEmptyOptionsObject);
						describe('Given an address "13356260975429434553L"', () => {
							beforeEach(given.anAddress);
							describe('Given an invalid amount "abc"', () => {
								beforeEach(given.anInvalidAmount);
								describe('When the action is called with the amount, the address and the options', () => {
									beforeEach(when.theActionIsCalledWithTheAmountTheAddressAndTheOptions);
									it('Then it should reject with message "Amount must be a number with no more than 8 decimal places."', then.itShouldRejectWithMessage);
								});
							});
							describe('Given an invalid amount "100,5"', () => {
								beforeEach(given.anInvalidAmount);
								describe('When the action is called with the amount, the address and the options', () => {
									beforeEach(when.theActionIsCalledWithTheAmountTheAddressAndTheOptions);
									it('Then it should reject with message "Amount must be a number with no more than 8 decimal places."', then.itShouldRejectWithMessage);
								});
							});
						});
						describe('Given an amount "100.123"', () => {
							beforeEach(given.anAmount);
							describe('Given an invalid address "1234567890LL"', () => {
								beforeEach(given.anInvalidAddress);
								describe('When the action is called with the amount, the address and the options', () => {
									beforeEach(when.theActionIsCalledWithTheAmountTheAddressAndTheOptions);
									it('Then it should reject with message "1234567890LL is not a valid address."', then.itShouldRejectWithMessage);
								});
							});
							describe('Given an address "13356260975429434553L"', () => {
								beforeEach(given.anAddress);
								describe('Given an error "Unknown data source type. Must be one of `file`, or `stdin`." occurs retrieving the inputs from their sources', () => {
									beforeEach(given.anErrorOccursRetrievingTheInputsFromTheirSources);
									describe('When the action is called with the amount, the address and the options', () => {
										beforeEach(when.theActionIsCalledWithTheAmountTheAddressAndTheOptions);
										it('Then it should reject with the error message', then.itShouldRejectWithTheErrorMessage);
									});
								});
								describe('Given the passphrase can be retrieved from its source', () => {
									beforeEach(given.thePassphraseCanBeRetrievedFromItsSource);
									describe('When the action is called with the amount, the address and the options', () => {
										beforeEach(when.theActionIsCalledWithTheAmountTheAddressAndTheOptions);
										it('Then it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
										it('Then it should get the inputs from sources using the passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt);
										it('Then it should not get the inputs from sources using the second passphrase source', then.itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource);
										it('Then it should create a transfer transaction using the address, the amount and the passphrase', then.itShouldCreateATransferTransactionUsingTheAddressTheAmountAndThePassphrase);
										it('Then it should resolve to the created transaction', then.itShouldResolveToTheCreatedTransaction);
									});
								});
								describe('Given an options object with passphrase set to "passphraseSource"', () => {
									beforeEach(given.anOptionsObjectWithPassphraseSetTo);
									describe('Given an error "Unknown data source type. Must be one of `file`, or `stdin`." occurs retrieving the inputs from their sources', () => {
										beforeEach(given.anErrorOccursRetrievingTheInputsFromTheirSources);
										describe('When the action is called with the amount, the address and the options', () => {
											beforeEach(when.theActionIsCalledWithTheAmountTheAddressAndTheOptions);
											it('Then it should reject with the error message', then.itShouldRejectWithTheErrorMessage);
										});
									});
									describe('Given the passphrase can be retrieved from its source', () => {
										beforeEach(given.thePassphraseCanBeRetrievedFromItsSource);
										describe('When the action is called with the amount, the address and the options', () => {
											beforeEach(when.theActionIsCalledWithTheAmountTheAddressAndTheOptions);
											it('Then it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
											it('Then it should get the inputs from sources using the passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt);
											it('Then it should not get the inputs from sources using the second passphrase source', then.itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource);
											it('Then it should create a transfer transaction using the address, the amount and the Passphrase', then.itShouldCreateATransferTransactionUsingTheAddressTheAmountAndThePassphrase);
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
											describe('When the action is called with the amount, the address and the options', () => {
												beforeEach(when.theActionIsCalledWithTheAmountTheAddressAndTheOptions);
												it('Then it should reject with the error message', then.itShouldRejectWithTheErrorMessage);
											});
										});
										describe('Given the passphrase and second passphrase can be retrieved from their sources', () => {
											beforeEach(given.thePassphraseAndSecondPassphraseCanBeRetrievedFromTheirSources);
											describe('When the action is called with the amount, the address and the options', () => {
												beforeEach(when.theActionIsCalledWithTheAmountTheAddressAndTheOptions);
												it('Then it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
												it('Then it should get the inputs from sources using the passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt);
												it('Then it should get the inputs from sources using the second passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingTheSecondPassphraseSourceWithARepeatingPrompt);
												it('Then it should create a transfer transaction using the address, the amount, the Passphrase and the second passphrase', then.itShouldCreateATransferTransactionUsingTheAddressTheAmountThePassphraseAndTheSecondPassphrase);
												it('Then it should resolve to the created transaction', then.itShouldResolveToTheCreatedTransaction);
											});
										});
									});
									describe('Given an options object with passphrase set to "passphraseSource" and second passphrase set to "secondPassphraseSource"', () => {
										beforeEach(given.anOptionsObjectWithPassphraseSetToAndSecondPassphraseSetTo);
										describe('Given an error "Unknown data source type. Must be one of `file`, or `stdin`." occurs retrieving the inputs from their sources', () => {
											beforeEach(given.anErrorOccursRetrievingTheInputsFromTheirSources);
											describe('When the action is called with the amount, the address and the options', () => {
												beforeEach(when.theActionIsCalledWithTheAmountTheAddressAndTheOptions);
												it('Then it should reject with the error message', then.itShouldRejectWithTheErrorMessage);
											});
										});
										describe('Given the passphrase and second passphrase can be retrieved from their sources', () => {
											beforeEach(given.thePassphraseAndSecondPassphraseCanBeRetrievedFromTheirSources);
											describe('When the action is called with the amount, the address and the options', () => {
												beforeEach(when.theActionIsCalledWithTheAmountTheAddressAndTheOptions);
												it('Then it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
												it('Then it should get the inputs from sources using the passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt);
												it('Then it should get the inputs from sources using the second passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingTheSecondPassphraseSourceWithARepeatingPrompt);
												it('Then it should create a transfer transaction using the address, the amount, the Passphrase and the second passphrase', then.itShouldCreateATransferTransactionUsingTheAddressTheAmountThePassphraseAndTheSecondPassphrase);
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
	});
});
