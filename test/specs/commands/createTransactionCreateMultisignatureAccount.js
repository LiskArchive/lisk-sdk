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
import { setUpCommandCreateTransactionCreateMultisignatureAccount } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('create transaction create multisignature account command', () => {
	beforeEach(setUpCommandCreateTransactionCreateMultisignatureAccount);
	describe('Given a Vorpal instance with a UI and an active command that can prompt', () => {
		beforeEach(given.aVorpalInstanceWithAUIAndAnActiveCommandThatCanPrompt);
		describe('Given an action "create transaction create multisignature account"', () => {
			beforeEach(given.anAction);
			describe('Given a passphrase "minute omit local rare sword knee banner pair rib museum shadow juice"', () => {
				beforeEach(given.aPassphrase);
				describe('Given a Lisk object that can create transactions', () => {
					beforeEach(given.aLiskObjectThatCanCreateTransactions);
					describe('Given a lifetime of "NaN" hours', () => {
						beforeEach(given.aLifetimeOfHours);
						describe('Given a minimum of 2 signatures', () => {
							beforeEach(given.aMinimumOfSignatures);
							describe('Given a keysgroup with keys "215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca" and "922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa"', () => {
								beforeEach(given.aKeysgroupWithKeys);
								describe('Given an empty options object', () => {
									beforeEach(given.anEmptyOptionsObject);
									describe('When the action is called with the keysgroup, the lifetime, the minimum number of signatures and the options', () => {
										beforeEach(when.theActionIsCalledWithTheKeysgroupTheLifetimeTheMinimumNumberOfSignaturesAndTheOptions);
										it('Then it should reject with message "Lifetime must be a number."', then.itShouldRejectWithMessage);
									});
								});
							});
						});
					});
					describe('Given a lifetime of 24 hours', () => {
						beforeEach(given.aLifetimeOfHours);
						describe('Given a minimum of "NaN" signatures', () => {
							beforeEach(given.aMinimumOfSignatures);
							describe('Given a keysgroup with keys "215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca" and "922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa"', () => {
								beforeEach(given.aKeysgroupWithKeys);
								describe('Given an empty options object', () => {
									beforeEach(given.anEmptyOptionsObject);
									describe('When the action is called with the keysgroup, the lifetime, the minimum number of signatures and the options', () => {
										beforeEach(when.theActionIsCalledWithTheKeysgroupTheLifetimeTheMinimumNumberOfSignaturesAndTheOptions);
										it('Then it should reject with message "Minimum confirmations must be a number."', then.itShouldRejectWithMessage);
									});
								});
							});
						});
						describe('Given a minimum of 2 signatures', () => {
							beforeEach(given.aMinimumOfSignatures);
							describe('Given a keysgroup with keys "+215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca"', () => {
								beforeEach(given.aKeysgroupWithKeys);
								describe('Given an empty options object', () => {
									beforeEach(given.anEmptyOptionsObject);
									describe('When the action is called with the keysgroup, the lifetime, the minimum number of signatures and the options', () => {
										beforeEach(when.theActionIsCalledWithTheKeysgroupTheLifetimeTheMinimumNumberOfSignaturesAndTheOptions);
										it('Then it should reject with message "Error processing public key +215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca: Invalid hex string."', then.itShouldRejectWithMessage);
									});
								});
							});
							describe('Given a keysgroup with keys "215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452b"', () => {
								beforeEach(given.aKeysgroupWithKeys);
								describe('Given an empty options object', () => {
									beforeEach(given.anEmptyOptionsObject);
									describe('When the action is called with the keysgroup, the lifetime, the minimum number of signatures and the options', () => {
										beforeEach(when.theActionIsCalledWithTheKeysgroupTheLifetimeTheMinimumNumberOfSignaturesAndTheOptions);
										it('Then it should reject with message "Public key 215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452b length differs from the expected 64 hex characters for a public key."', then.itShouldRejectWithMessage);
									});
								});
							});
							describe('Given a keysgroup with keys "215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca" and "922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa"', () => {
								beforeEach(given.aKeysgroupWithKeys);
								describe('Given an empty options object', () => {
									beforeEach(given.anEmptyOptionsObject);
									describe('Given an error "Unknown data source type. Must be one of `file`, or `stdin`." occurs retrieving the inputs from their sources', () => {
										beforeEach(given.anErrorOccursRetrievingTheInputsFromTheirSources);
										describe('When the action is called with the keysgroup, the lifetime, the minimum number of signatures and the options', () => {
											beforeEach(when.theActionIsCalledWithTheKeysgroupTheLifetimeTheMinimumNumberOfSignaturesAndTheOptions);
											it('Then it should reject with the error message', then.itShouldRejectWithTheErrorMessage);
										});
									});
									describe('Given the passphrase can be retrieved from its source', () => {
										beforeEach(given.thePassphraseCanBeRetrievedFromItsSource);
										describe('When the action is called with the keysgroup, the lifetime, the minimum number of signatures and the options', () => {
											beforeEach(when.theActionIsCalledWithTheKeysgroupTheLifetimeTheMinimumNumberOfSignaturesAndTheOptions);
											it('Then it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
											it('Then it should get the inputs from sources using the passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt);
											it('Then it should not get the inputs from sources using the second passphrase source', then.itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource);
											it('Then it should create a create multisignature account transaction using the passphrase, the keysgroup, the lifetime and the minimum number of signatures', then.itShouldCreateACreateMultisignatureAccountTransactionUsingThePassphraseTheKeysgroupTheLifetimeAndTheMinimumNumberOfSignatures);
											it('Then it should resolve to the created transaction', then.itShouldResolveToTheCreatedTransaction);
										});
									});
								});
								describe('Given an options object with passphrase set to "passphraseSource"', () => {
									beforeEach(given.anOptionsObjectWithPassphraseSetTo);
									describe('Given an error "Unknown data source type. Must be one of `file`, or `stdin`." occurs retrieving the inputs from their sources', () => {
										beforeEach(given.anErrorOccursRetrievingTheInputsFromTheirSources);
										describe('When the action is called with the keysgroup, the lifetime, the minimum number of signatures and the options', () => {
											beforeEach(when.theActionIsCalledWithTheKeysgroupTheLifetimeTheMinimumNumberOfSignaturesAndTheOptions);
											it('Then it should reject with the error message', then.itShouldRejectWithTheErrorMessage);
										});
									});
									describe('Given the passphrase can be retrieved from its source', () => {
										beforeEach(given.thePassphraseCanBeRetrievedFromItsSource);
										describe('When the action is called with the keysgroup, the lifetime, the minimum number of signatures and the options', () => {
											beforeEach(when.theActionIsCalledWithTheKeysgroupTheLifetimeTheMinimumNumberOfSignaturesAndTheOptions);
											it('Then it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
											it('Then it should get the inputs from sources using the passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt);
											it('Then it should not get the inputs from sources using the second passphrase source', then.itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource);
											it('Then it should create a create multisignature account transaction using the passphrase, the keysgroup, the lifetime and the minimum number of signatures', then.itShouldCreateACreateMultisignatureAccountTransactionUsingThePassphraseTheKeysgroupTheLifetimeAndTheMinimumNumberOfSignatures);
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
											describe('When the action is called with the keysgroup, the lifetime, the minimum number of signatures and the options', () => {
												beforeEach(when.theActionIsCalledWithTheKeysgroupTheLifetimeTheMinimumNumberOfSignaturesAndTheOptions);
												it('Then it should reject with the error message', then.itShouldRejectWithTheErrorMessage);
											});
										});
										describe('Given the passphrase and second passphrase can be retrieved from their sources', () => {
											beforeEach(given.thePassphraseAndSecondPassphraseCanBeRetrievedFromTheirSources);
											describe('When the action is called with the keysgroup, the lifetime, the minimum number of signatures and the options', () => {
												beforeEach(when.theActionIsCalledWithTheKeysgroupTheLifetimeTheMinimumNumberOfSignaturesAndTheOptions);
												it('Then it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
												it('Then it should get the inputs from sources using the passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt);
												it('Then it should get the inputs from sources using the second passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingTheSecondPassphraseSourceWithARepeatingPrompt);
												it('Then it should create a create multisignature account transaction using the passphrase, the second passphrase, the keysgroup, the lifetime and the minimum number of signatures', then.itShouldCreateACreateMultisignatureAccountTransactionUsingThePassphraseTheSecondPassphraseTheKeysgroupTheLifetimeAndTheMinimumNumberOfSignatures);
												it('Then it should resolve to the created transaction', then.itShouldResolveToTheCreatedTransaction);
											});
										});
									});
									describe('Given an options object with passphrase set to "passphraseSource" and second passphrase set to "secondPassphraseSource"', () => {
										beforeEach(given.anOptionsObjectWithPassphraseSetToAndSecondPassphraseSetTo);
										describe('Given an error "Unknown data source type. Must be one of `file`, or `stdin`." occurs retrieving the inputs from their sources', () => {
											beforeEach(given.anErrorOccursRetrievingTheInputsFromTheirSources);
											describe('When the action is called with the keysgroup, the lifetime, the minimum number of signatures and the options', () => {
												beforeEach(when.theActionIsCalledWithTheKeysgroupTheLifetimeTheMinimumNumberOfSignaturesAndTheOptions);
												it('Then it should reject with the error message', then.itShouldRejectWithTheErrorMessage);
											});
										});
										describe('Given the passphrase and second passphrase can be retrieved from their sources', () => {
											beforeEach(given.thePassphraseAndSecondPassphraseCanBeRetrievedFromTheirSources);
											describe('When the action is called with the keysgroup, the lifetime, the minimum number of signatures and the options', () => {
												beforeEach(when.theActionIsCalledWithTheKeysgroupTheLifetimeTheMinimumNumberOfSignaturesAndTheOptions);
												it('Then it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
												it('Then it should get the inputs from sources using the passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt);
												it('Then it should get the inputs from sources using the second passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingTheSecondPassphraseSourceWithARepeatingPrompt);
												it('Then it should create a create multisignature account transaction using the passphrase, the second passphrase, the keysgroup, the lifetime and the minimum number of signatures', then.itShouldCreateACreateMultisignatureAccountTransactionUsingThePassphraseTheSecondPassphraseTheKeysgroupTheLifetimeAndTheMinimumNumberOfSignatures);
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
